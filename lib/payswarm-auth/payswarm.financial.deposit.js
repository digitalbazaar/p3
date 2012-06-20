/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  events: require('./payswarm.events'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  money: require('./payswarm.money'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools')
};
var Money = payswarm.money.Money;
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = payswarm.financial.type;
var MODULE_IRI = payswarm.financial.iri;

// sub module API
var api = {};
module.exports = api;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  callback();
};

/**
 * Validates and signs a financial Deposit. This method will not actually
 * process the Deposit, it will not be submitted to any external payment
 * gateway. To process the Deposit, call processDeposit() after it has been
 * reviewed and found to be acceptable by the owner of the source account.
 *
 * @param actor the Profile performing the action.
 * @param deposit the Deposit to sign.
 * @param callback(err, deposit) called once the operation completes.
 */
api.signDeposit = function(actor, deposit, callback) {
  // get sorted payees
  var payees = payswarm.tools.sortPayees(deposit['com:payee']);

  async.waterfall([
    function(callback) {
      // ensure profile has access to each destination account
      async.forEach(payees, function(payee, callback) {
        // FIXME: is this necessary? may just be a hack to simplify
        // web page templates and if so shouldn't be here
        if(!('rdfs:comment' in payee)) {
          payee['rdfs:comment'] = 'Deposit';
        }
        payswarm.financial.getAccount(
          actor, payee['com:destination'], callback);
      }, function(err) {
        callback(err);
      });
    },
    function(callback) {
      // add deposit payees for given gateway
      var gateway = deposit['com:source']['com:gateway'];
      var gatewayPayees = payswarm.config.financial.paymentGateway[
        gateway]['com:payee'];

      // append gateway payees
      payswarm.tools.appendPayees(payees, gatewayPayees);

      // update payees
      deposit['com:payee'] = payees;
      callback(null);
    },
    function(callback) {
      // get a transaction ID for the deposit
      payswarm.financial.generateTransactionId(callback);
    },
    function(id, callback) {
      deposit.id = id;

      // FIXME: what should the source ID be here?
      var sourceId = 'urn:payswarm-external-account';

      // create transfers
      payswarm.tools.createTransfers(deposit, sourceId, payees);

      // FIXME: should deposits with zero-amount transfers be illegal?

      // ensure no zero-amount or negative transfers
      /* Note: When dealing with money external to the system, round to
         2 decimal places, rounding each transfer up. */
      var total = new Money(0, 2, Money.ROUND_MODE.UP);
      var transfers = jsonld.getValues(deposit, 'com:transfer');
      for(var i in transfers) {
        var transfer = transfers[i];
        var amount = new Money(transfer['com:amount'], 2, Money.ROUND_MODE.UP);
        if(amount.isZero() || amount.isNegative()) {
          return callback(new PaySwarmError(
            'A Transfer does not have a valid amount.',
            MODULE_TYPE + '.InvalidDeposit', {'com:transfer': transfer}));
        }
        // use rounded amount, update total
        transfer['com:amount'] = amount.toString();
        total = total.add(amount);
      }

      // set new rounded total and assign date
      deposit['com:amount'] = total.toString();
      deposit['com:date'] = payswarm.tools.w3cDate();

      // sign deposit
      payswarm.financial.signTransaction(deposit, function(err, signed) {
        if(err) {
          return callback(new PaySwarmError(
            'The deposit could not be digitally signed. Please report this' +
            'error.', MODULE_TYPE + '.DepositSignatureError'),
            {critical: true}, err);
        }
        callback(null, signed);
      });
    }
  ], callback);
};

/**
 * Processes a signed financial Deposit. This method must only be called
 * after signDeposit().
 *
 * @param actor the Profile performing the action.
 * @param deposit the Deposit to process.
 * @param callback(err, deposit) called once the operation completes.
 */
api.processDeposit = function(actor, deposit, callback) {
  // get payment gateway for deposit
  var gateway = deposit['com:source']['com:gateway'];
  if(!(gateway in payswarm.financial.paymentGateways)) {
    return callback(new PaySwarmError(
      'Could not process Deposit; invalid payment gateway.',
      MODULE_TYPE + '.InvalidPaymentGateway', {gateway: gateway}));
  }
  gateway = payswarm.financial.paymentGateways[gateway];

  // ensure deposit has not expired yet
  var now = +new Date();
  var parsed = 0;
  try {
    parsed = +Date.parse(deposit['com:date']);
  }
  catch(ex) {
    // ignore bad date format
  }
  if((now - parsed) > payswarm.config.financial.depositExpiration) {
    return callback(new PaySwarmError(
      'Could not process Deposit; it has expired.',
      MODULE_TYPE + '.DepositExpired'));
  }

  // start building event to send
  var event = {details: {}};

  async.waterfall([
    function(callback) {
      // get signature public key
      var key = {id: deposit['sec:signature']['dc:creator']};
      payswarm.identity.getIdentityPublicKey(key, function(err, publicKey) {
        callback(err, publicKey);
      });
    },
    function(key, callback) {
      // ensure authority owns the key
      if(key['ps:owner'] !== payswarm.config.authority.id) {
        return callback(new PaySwarmError(
          'Could not process Deposit; it was not signed by the ' +
          'PaySwarm Authority.',
          MODULE_TYPE + '.InvalidDepositSigner'));
      }

      // verify signature
      payswarm.security.verifyJsonLd(deposit, key, callback);
    },
    function(verified, callback) {
      if(!verified) {
        return callback(new PaySwarmError(
          'Could not process Deposit; its digital signature could not be ' +
          'verified which may indicate its contents have changed.',
          MODULE_TYPE + '.InvalidDepositSignature'));
      }
      callback(null);
    },
    function(callback) {
      // FIXME: look up profile to send email ... this works if the
      // deposit was on the website, but in other cases it may send the
      // email to the wrong location, looking up the deposit profile
      // is difficult (look up each deposit account's profile and
      // send emails indicating a deposit of X amount occurred?)
      payswarm.profile.getProfile(
        actor, actor.id, function(err, profile) {
          event.details.profile = profile;
          callback(err);
        });
    },
    function(callback) {
      // authorize and charge deposit via gateway
      async.waterfall([
        function(callback) {
          gateway.authorizeDeposit(deposit, callback);
        },
        function(callback) {
          gateway.chargeDeposit(deposit, callback);
        }
      ], function(err) {
        if(err) {
          err = new PaySwarmError(
            'Could not authorize/charge a Deposit via the payment gateway.',
            MODULE_TYPE + '.TransactionConflict',
            {transactionId: deposit.id}, err);

          // emit deposit failure event
          event.type = 'payswarm.common.Deposit.failure';
          event.details.deposit = deposit;
          event.details.error = err.toObject();
          payswarm.events.emit(event.type, payswarm.tools.clone(event));
          return callback(err);
        }
        callback();
      });
    },
    function(callback) {
      gateway.blindDeposit(deposit, callback);
    },
    function(blinded, callback) {
      // authorize the transaction locally
      payswarm.financial.authorizeTransaction(blinded, function(err) {
        event.details.deposit = deposit;
        if(err) {
          err = new PaySwarmError(
            'Could not authorize a Transaction that was already processed ' +
            'by a payment gateway.',
            MODULE_TYPE + '.TransactionConflict',
            {transactionId: deposit.id}, err);

          /* Note: This is a critical failure. It means the deposit was
             charged successfully via the gateway but the transaction
             failed to be authorized locally (should never/rarely happen). */
          event.type = 'payswarm.common.Deposit.failure';
          event.details.error = err.toObject();
          payswarm.events.emit(event.type, event);
          return callback(err);
        }
        // emit deposit success event
        event.type = 'payswarm.common.Deposit.success';
        payswarm.events.emit(event.type, event);
        callback(null, blinded);
      });
    }
  ], function(err, blinded) {
    callback(err, blinded);
  });
};
