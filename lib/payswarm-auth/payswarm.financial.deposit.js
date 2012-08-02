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
  var payees = payswarm.tools.sortPayees(deposit.payee);

  async.auto({
    checkAccountAccess: function(callback) {
      // ensure profile has access to each destination account
      async.forEach(payees, function(payee, callback) {
        // FIXME: is this necessary? may just be a hack to simplify
        // web page templates and if so shouldn't be here
        if(!('comment' in payee)) {
          payee.comment = 'Deposit';
        }
        payswarm.financial.getAccount(
          actor, payee.destination, callback);
      }, function(err) {
        callback(err);
      });
    },
    getSource: function(callback) {
      // populate payment source
      payswarm.financial.getPaymentToken(actor, deposit.source,
        function(err, token) {
          callback(err, token);
      });
    },
    addGatewayPayees: ['getSource', function(callback, results) {
      // add deposit payees for given gateway
      deposit.source = results.getSource;
      var gateway = deposit.source.paymentGateway;
      if(!(gateway in payswarm.config.financial.paymentGateway)) {
        return callback(new PaySwarmError(
          'Invalid payment gateway.',
          MODULE_TYPE + '.InvalidPaymentGateway',
          {paymentGateway: gateway}));
      }
      var gatewayPayees =
        payswarm.config.financial.paymentGateway[gateway].payee;

      // append gateway payees
      payswarm.tools.appendPayees(payees, gatewayPayees);

      // update payees
      deposit.payee = payees;
      callback(null);
    }],
    getId: function(callback) {
      // get a transaction ID for the deposit
      payswarm.financial.generateTransactionId(callback);
    },
    sign: ['checkAccountAccess', 'addGatewayPayees', 'getId',
      function(callback, results) {
        deposit.id = results.getId;

        // FIXME: what should the source ID be here?
        var sourceId = 'urn:payswarm-external-account';

        // create transfers
        payswarm.tools.createTransfers(deposit, sourceId, payees);

        // FIXME: should deposits with zero-amount transfers be illegal?

        // ensure no zero-amount or negative transfers
        /* Note: When dealing with money external to the system, round to
           2 decimal places, rounding each transfer up. */
        var total = new Money(0, 2, Money.ROUND_MODE.UP);
        var transfers = jsonld.getValues(deposit, 'transfer');
        for(var i in transfers) {
          var transfer = transfers[i];
          var amount = new Money(transfer.amount, 2, Money.ROUND_MODE.UP);
          if(amount.isZero() || amount.isNegative()) {
            return callback(new PaySwarmError(
              'A Transfer does not have a valid amount.',
              MODULE_TYPE + '.InvalidDeposit', {transfer: transfer}));
          }
          // use rounded amount, update total
          transfer.amount = amount.toString();
          total = total.add(amount);
        }

        // set new rounded total and assign date
        deposit.amount = total.toString();
        deposit.created = payswarm.tools.w3cDate();

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
      }]
  }, function(err, results) {
    callback(err, results ? results.sign : null);
  });
};

/**
 * Processes a signed financial Deposit. This method must only be called
 * after signDeposit().
 *
 * @param actor the Profile performing the action. null if the actor should be
 *          the payswarm authority.
 * @param deposit the Deposit to process.
 * @param [options] the options to use.
 *          [request] the HTTP request that originated the deposit; null if
 *            the request did not originate via HTTP.
 * @param callback(err, deposit) called once the operation completes.
 */
api.processDeposit = function(actor, deposit, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  // get payment gateway for deposit
  var gateway = deposit.source.paymentGateway;
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
    parsed = +Date.parse(deposit.created);
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

  async.auto({
    getPublicKey: function(callback) {
      // get signature public key
      var key = {id: deposit.signature.creator};
      payswarm.identity.getIdentityPublicKey(key, function(err, publicKey) {
        callback(err, publicKey);
      });
    },
    verify: ['getPublicKey', function(callback, results) {
      // ensure authority owns the key
      var key = results.getPublicKey;
      if(key.owner !== payswarm.config.authority.id) {
        return callback(new PaySwarmError(
          'Could not process Deposit; it was not signed by the ' +
          'PaySwarm Authority.',
          MODULE_TYPE + '.InvalidDepositSigner'));
      }

      // verify signature
      payswarm.security.verifyJsonLd(deposit, key, function(err, verified) {
        if(!verified) {
          return callback(err || new PaySwarmError(
            'Could not process Deposit; its digital signature could not be ' +
            'verified which may indicate its contents have changed.',
            MODULE_TYPE + '.InvalidDepositSignature'));
        }
        callback();
      });
    }],
    getProfile: ['verify', function(callback) {
      // FIXME: look up profile to send email ... this works if the
      // deposit was on the website, but in other cases it may send the
      // email to the wrong location, looking up the deposit profile
      // is difficult (look up each deposit account's profile and
      // send emails indicating a deposit of X amount occurred?)
      // FIXME: is this the right behavior?

      // if no actor specified, use authority profile
      var profileId = actor ? actor.id : payswarm.config.authority.profile;
      payswarm.profile.getProfile(null, profileId, function(err, profile) {
        if(!err) {
          event.details.profile = profile;
        }
        callback(err, profile);
      });
    }],
    chargeSource: ['getProfile', function(callback, results) {
      // charge deposit source via gateway
      gateway.chargeDepositSource(deposit, function(err, result) {
        if(err) {
          err = new PaySwarmError(
            'Could not charge the Deposit source via the payment gateway.',
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
    }],
    blind: ['chargeSource', function(callback) {
      gateway.blindDeposit(deposit, callback);
    }],
    authorize: ['blind', function(callback, results) {
      // authorize the transaction locally
      var blinded = results.blind;
      payswarm.financial.authorizeTransaction(blinded, function(err) {
        // include request headers and deposit in event details
        if(options.request && options.request.headers) {
          event.details.headers = options.request.headers;
        }
        event.details.deposit = blinded;

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
    }]
  }, function(err, results) {
    callback(err, results ? results.authorize : null);
  });
};
