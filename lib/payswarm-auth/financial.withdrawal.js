/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  permission: require('./permission'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools')
};
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
 * Validates and signs a financial Withdrawal. This method will not actually
 * process the Withdrawal, it will not be submitted to any external payment
 * gateway. To process the Withdrawal, call processWithdrawal() after it has
 * been reviewed and found to be acceptable by the owner of the source account.
 *
 * @param actor the Profile performing the action.
 * @param withdrawal the Withdrawal to sign.
 * @param callback(err, withdrawal) called once the operation completes.
 */
api.signWithdrawal = function(actor, withdrawal, callback) {
  // get sorted payees
  var payees = payswarm.tools.sortPayees(withdrawal.payee);

  // FIXME: convert from deposit to withdrawal

  async.auto({
    checkAccountAccess: function(callback) {
      // ensure profile has access to each destination account
      async.forEachSeries(payees, function(payee, callback) {
        // FIXME: is this necessary? may just be a hack to simplify
        // web page templates and if so shouldn't be here
        if(!('comment' in payee)) {
          payee.comment = 'Deposit';
        }
        payswarm.financial.getAccount(actor, payee.destination, callback);
      }, callback);
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
 * Processes a signed financial Withdrawal. This method must only be called
 * after signWithdrawal().
 *
 * @param actor the Profile performing the action. null if the actor should be
 *          the payswarm authority.
 * @param withdrawal the Withdrawal to process.
 * @param [options] the options to use.
 *          [request] the HTTP request that originated the withdrawal; null if
 *            the request did not originate via HTTP.
 * @param callback(err, withdrawal) called once the operation completes.
 */
api.processWithdrawal = function(actor, withdrawal, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  // get payment gateway for withdrawal
  var gateway = withdrawal.destination.paymentGateway;
  if(!(gateway in payswarm.financial.paymentGateways)) {
    return callback(new PaySwarmError(
      'Could not process Withdrawal; invalid payment gateway.',
      MODULE_TYPE + '.InvalidPaymentGateway', {gateway: gateway}));
  }
  gateway = payswarm.financial.paymentGateways[gateway];

  // ensure withdrawal has not expired yet
  var now = +new Date();
  var parsed = 0;
  try {
    parsed = +Date.parse(withdrawal.created);
  }
  catch(ex) {
    // ignore bad date format
  }
  if((now - parsed) > payswarm.config.financial.withdrawal.expiration) {
    return callback(new PaySwarmError(
      'Could not process Withdrawal; it has expired.',
      MODULE_TYPE + '.WithdrawalExpired'));
  }

  // start building event to send
  var event = {details: {}};

  async.auto({
    getPublicKey: function(callback) {
      // get signature public key
      var key = {id: withdrawal.signature.creator};
      payswarm.identity.getIdentityPublicKey(key, function(err, publicKey) {
        callback(err, publicKey);
      });
    },
    verify: ['getPublicKey', function(callback, results) {
      // ensure authority owns the key
      var key = results.getPublicKey;
      if(key.owner !== payswarm.config.authority.id) {
        return callback(new PaySwarmError(
          'Could not process Withdrawal; it was not signed by the ' +
          'PaySwarm Authority.',
          MODULE_TYPE + '.InvalidWithdrawalSigner'));
      }

      // verify signature
      payswarm.security.verifyJsonLd(withdrawal, key, function(err, verified) {
        if(!verified) {
          return callback(err || new PaySwarmError(
            'Could not process Withdrawal; its digital signature could not ' +
            'be verified which may indicate its contents have changed.',
            MODULE_TYPE + '.InvalidWithdrawalSignature'));
        }
        // remove signature from withdrawal
        delete withdrawal.signature;
        callback();
      });
    }],
    authorize: ['verify', function(callback) {
      // authorize the transaction locally
      payswarm.financial.authorizeTransaction(withdrawal, callback);
    }],
    getProfile: ['verify', function(callback) {
      // get profile owner of destination account to send email
      var profileId = withdrawal.destination.owner;
      payswarm.profile.getProfile(null, profileId, function(err, profile) {
        if(!err) {
          event.details.profile = profile;
        }
        callback(err, profile);
      });
    }],
    creditDestination: ['authorize', function(callback, results) {
      // credit destination via gateway
      gateway.creditWithdrawalDestination(withdrawal, function(err, result) {
        if(err) {
          err = new PaySwarmError(
            'Could not credit the Withdrawal destination via the payment ' +
            'gateway.', MODULE_TYPE + '.TransactionConflict',
            {transactionId: withdrawal.id}, err);

          // emit withdrawal failure event
          event.type = 'common.Withdrawal.failure';
          event.details.withdrawal = withdrawal;
          event.details.error = err.toObject();
          payswarm.events.emit(event.type, payswarm.tools.clone(event));
          return callback(err);
        }

        // FIXME: add a method to later add annotations to transactions
        // already stored locally (so we can add PNREF, etc. other stuff
        // from the gateway to withdrawals that occur after local
        // authorization

        // FIXME: emit event that external withdrawal happened so we
        // can track it internally
        callback();
      });
    }],
    blind: ['creditDestination', function(callback) {
      gateway.blindWithdrawal(withdrawal, callback);
    }],
    notify: ['getProfile', 'blind', function(callback, results) {
      var blinded = results.blind;

      // include request headers and withdrawal in event details
      if(options.request && options.request.headers) {
        event.details.headers = options.request.headers;
      }
      event.details.withdrawal = blinded;

      // emit withdrawal success and logging events
      event.type = 'common.Withdrawal.success';
      payswarm.events.emit(event.type, event);
      var dst = blinded.destination;
      if(jsonld.hasValue(dst, 'paymentMethod', 'bank:BankAccount')) {
        event.type = 'common.Withdrawal.ach-merchant-account-log';
        payswarm.events.emit(event.type, event);
      }
      callback(null, blinded);
    }]
  }, function(err, results) {
    callback(err, results ? results.notify : null);
  });
};
