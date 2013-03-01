/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  events: require('./events'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  money: require('./money'),
  permission: require('./permission'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools')
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
 * @param options the options to use.
 *          [verify] true if the deposit is for payment token verification,
 *            false if not (default: false).
 *          [amounts] the verify amounts to use.
 * @param callback(err, deposit) called once the operation completes.
 */
api.signDeposit = function(actor, deposit, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  async.auto({
    checkPayeeGroups: function(callback) {
      // skip check when verifying
      if(options.verify && options.amounts) {
        return callback();
      }
      var payees = jsonld.getValues(deposit, 'payee');
      payswarm.tools.checkPayeeGroups(payees, callback);
    },
    checkAccountAccess: ['checkPayeeGroups', function(callback) {
      // when verifying, there may be no customer deposit payee
      var payees = jsonld.getValues(deposit, 'payee');
      if(payees.length === 0 && options.verify && options.amounts) {
        return callback();
      }

      // ensure profile has access to destination account
      if(payees.length !== 1) {
        return callback(new PaySwarmError(
          'Invalid Deposit; a Deposit must have a single ' +
          'financial account Payee.', MODULE_TYPE + '.InvalidDeposit'));
      }

      // force payee into gateway group
      var payee = payees[0];
      jsonld.addValue(
        payee, 'payeeGroup', 'authority_gateway', {allowDuplicate: false});
      // FIXME: is adding a comment to the payee necessary?
      if(!('comment' in payee)) {
        payee.comment = 'Deposit';
      }
      payswarm.financial.getAccount(actor, payee.destination,
        function(err, account) {
        callback(err, account);
      });
    }],
    getCurrency: ['checkAccountAccess', function(callback, results) {
      if(options.verify && options.amounts) {
        // FIXME: if verification amounts exist then deposit MUST be all USD.
        return callback(null, 'USD');
      }
      else if(results.checkAccountAccess) {
        return callback(null, results.checkAccountAccess.currency);
      }
      else {
        // FIXME: can this happen?
        return callback(new PaySwarmError(
          'Invalid Deposit. No verification amounts or deposit account.',
          MODULE_TYPE + '.InvalidDeposit'));
      }
    }],
    getSource: function(callback) {
      // populate payment source
      payswarm.financial.getPaymentToken(actor, deposit.source,
        function(err, token) {
          callback(err, token);
      });
    },
    checkSource: ['getSource', function(callback, results) {
      var source = deposit.source = results.getSource;
      var gateway = source.paymentGateway;
      if(!(gateway in payswarm.financial.paymentGateways)) {
        return callback(new PaySwarmError(
          'Invalid payment gateway.',
          MODULE_TYPE + '.InvalidPaymentGateway',
          {paymentGateway: gateway}));
      }
      // only permit active tokens
      if(source.psaStatus !== 'active') {
        return callback(new PaySwarmError(
          'Cannot perform deposit with an inactive payment method.',
          MODULE_TYPE + '.InactivePaymentToken',
          {paymentToken: source.id, 'public': true}));
      }
      // disallow unverified payment tokens unless this deposit is
      // for verification purposes itself
      if(!options.verify &&
        jsonld.hasValue(source, 'type', 'PaymentToken') &&
        !source.psaVerified) {
        return callback(new PaySwarmError(
          'Cannot perform deposit with an unverified payment method.',
          MODULE_TYPE + '.UnverifiedPaymentToken',
          {paymentToken: source.id, 'public': true}));
      }
      callback();
    }],
    checkLimits: ['getCurrency', function(callback, results) {
      // skip limit check when no payees and verifying
      var payees = jsonld.getValues(deposit, 'payee');
      if(payees.length === 0 && options.verify && options.amounts) {
        return callback();
      }

      // get external payee amount and check against limits
      var payee = payees[0];
      var amount = payswarm.money.createIncomingExternalMoney(payee.payeeRate);

      // check limits on exclusive amount
      var currency = results.getCurrency;
      var cfg = payswarm.config.financial.deposit;
      var min = cfg.limits[currency].minimum;
      if(amount.compareTo(min) < 0) {
        return callback(new PaySwarmError(
          'Minimum deposit amount is $' + min + '.',
          MODULE_TYPE + '.InvalidDeposit', {
            httpStatusCode: 400,
            'public': true
          }));
      }
      var max = cfg.limits[currency].maximum;
      if(amount.compareTo(max) > 0) {
        return callback(new PaySwarmError(
          'Maximum deposit amount is $' + max + '.',
          MODULE_TYPE + '.InvalidDeposit', {
            httpStatusCode: 400,
            'public': true
          }));
      }

      callback();
    }],
    addGatewayPayees: ['checkLimits', 'checkSource',
      function(callback, results) {
      // add payee for each amount to recoup verifications amounts
      if(options.verify && options.amounts) {
        var authAccount = payswarm.config.financial.paymentTokenVerifyAccount;
        options.amounts.forEach(function(amount) {
          jsonld.addValue(deposit, 'payee', {
            type: 'Payee',
            destination: authAccount,
            currency: 'USD',
            payeeGroup: ['authority_gateway'],
            payeeRate: new Money(amount).toString(),
            payeeRateType: 'FlatAmount',
            payeeApplyType: 'ApplyExclusively',
            comment: 'Recoup verification amount'
          });
        });
      }

      // add deposit payees for given gateway
      var gateway = deposit.source.paymentGateway;
      gateway = payswarm.financial.paymentGateways[gateway];
      gateway.addDepositPayees(deposit, callback);
    }],
    getId: function(callback) {
      // get a transaction ID for the deposit
      payswarm.financial.generateTransactionId(callback);
    },
    createTransfers: ['addGatewayPayees', 'getId', function(callback, results) {
      deposit.id = results.getId;
      var sourceId = deposit.source.id;
      var payees = jsonld.getValues(deposit, 'payee');
      // FIXME: set currency elsewhere?
      deposit.currency = results.getCurrency;
      payswarm.tools.createTransfers(deposit, sourceId, payees, callback);
    }],
    sign: ['createTransfers', function(callback, results) {
      // ensure no zero-total or negative transfers, use external money
      // factory function
      var total = payswarm.money.createIncomingExternalMoney(0);
      var transfers = jsonld.getValues(deposit, 'transfer');
      for(var i in transfers) {
        var transfer = transfers[i];
        var amount = payswarm.money.createIncomingExternalMoney(
          transfer.amount);
        if(amount.isNegative()) {
          return callback(new PaySwarmError(
            'A Transfer does not have a valid amount.',
            MODULE_TYPE + '.InvalidDeposit', {transfer: transfer}));
        }
        // use external money amount, update total
        transfer.amount = amount.toString();
        total = total.add(amount);
      }

      if(total.isZero()) {
        return callback(new PaySwarmError(
          'The deposit total cannot be zero.',
          MODULE_TYPE + '.InvalidDeposit', {deposit: deposit}));
      }

      // set new rounded total and assign date
      deposit.amount = total.toString();
      deposit.created = payswarm.tools.w3cDate();

      // sign deposit
      payswarm.financial.signTransaction(deposit, function(err, signed) {
        if(err) {
          return callback(new PaySwarmError(
            'The deposit could not be digitally signed. Please report this ' +
            'error.', MODULE_TYPE + '.DepositSignatureError'),
            {'public': true, critical: true}, err);
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
  if((now - parsed) > payswarm.config.financial.deposit.expiration) {
    return callback(new PaySwarmError(
      'Could not process Deposit; it has expired.',
      MODULE_TYPE + '.DepositExpired'));
  }

  /**
   * Helper function to build events with common data.
   *
   * @param emitOptions
   *        type: event type.
   *        results: the async.auto results.
   *        error: optional error.
   *        details: optional details to merge in with common details.
   * @return an event
   */
  function _emitEvent(emitOptions) {
    // basic event
    var event = {
      type: emitOptions.type,
      details: {
        profile: emitOptions.results.getProfile
      }
    };

    // include request headers if available
    if(options.request && options.request.headers) {
      event.details.headers = options.request.headers;
    }
    // include error information if available
    if(emitOptions.error) {
      event.details.error = emitOptions.error.toObject();
    }
    // include blinded deposit information if available
    if(emitOptions.results.blind) {
      event.details.deposit = emitOptions.results.blind;
    }
    // include extra details if given
    if(emitOptions.details) {
      payswarm.tools.extend(true, event.details, emitOptions.details);
    }

    payswarm.events.emit(event);
  }

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
        // remove signature from deposit
        delete deposit.signature;
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
        callback(err, profile);
      });
    }],
    chargeSource: ['getProfile', function(callback, results) {
      // charge deposit source via gateway
      gateway.chargeDepositSource(deposit, function(err, result) {
        if(err) {
          // blind the incomplete deposit
          return gateway.blindDeposit(deposit, function(blindErr, blind) {
            if(blindErr) {
              payswarm.logging.error('Error blinding deposit.', {
                id: deposit.id,
                error: blindErr
              });
              // fake the blind result
              blind = {id: deposit.id};
            }

            var httpStatusCode = 500;
            if(err.name === 'payswarm.paymentGateway.Declined') {
              httpStatusCode = 400;
            }
            err = new PaySwarmError(
              'The deposit could not be approved. Please ensure that the ' +
              'information you entered is correct and try again.',
              MODULE_TYPE + '.DepositNotApproved',
              {'public': true, httpStatusCode: httpStatusCode, id: deposit.id},
              err);

            // emit deposit failure event, include blind in async results
            results.blind = blind;
            _emitEvent({
              type: 'common.Deposit.failure',
              results: results,
              error: err
            });

            callback(err);
          });
        }
        callback();
      });
    }],
    blind: ['chargeSource', function(callback) {
      gateway.blindDeposit(deposit, callback);
    }],
    gatewayDepositNotify: ['blind', function(callback, results) {
      // Emit an even that can be used to track that a successful gateway
      // deposit is associated with a successful internal deposit.
      _emitEvent({
        type: 'common.Deposit.gatewaySuccess',
        results: results,
        details: {
          stage: 'gateway'
        }
      });
      callback();
    }],
    authorize: ['gatewayDepositNotify', function(callback, results) {
      // authorize the transaction locally
      var blinded = results.blind;
      payswarm.financial.authorizeTransaction(blinded, function(err) {
        if(err) {
          err = new PaySwarmError(
            'Could not authorize a Transaction locally that was processed ' +
            'by a payment gateway.',
            MODULE_TYPE + '.TransactionConflict', {id: deposit.id}, err);

          /* Note: This is a critical failure. It means the deposit was
             charged successfully via the gateway but the transaction
             failed to be authorized locally (should never/rarely happen). */
          _emitEvent({
            type: 'common.Deposit.failure',
            results: results,
            error: err
          });
          return callback(err);
        }
        // emit deposit success and logging events
        _emitEvent({
          type: 'common.Deposit.success',
          results: results,
          details: {
            stage: 'authority'
          }
        });
        var src = blinded.source;
        if(jsonld.hasValue(src, 'paymentMethod', 'BankAccount')) {
          _emitEvent({
            type: 'common.Deposit.ach-merchant-account-log',
            results: results
          });
        }
        else if(jsonld.hasValue(src, 'paymentMethod', 'CreditCard')) {
          _emitEvent({
            type: 'common.Deposit.cc-merchant-account-log',
            results: results
          });
        }
        callback(null, blinded);
      });
    }]
  }, function(err, results) {
    callback(err, results ? results.authorize : null);
  });
};
