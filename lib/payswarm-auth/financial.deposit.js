/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.module('config'),
  db: bedrock.module('bedrock.database'),
  events: bedrock.module('events'),
  financial: require('./financial'),
  identity: bedrock.module('bedrock.identity'),
  logger: bedrock.module('loggers').get('app'),
  money: require('./money'),
  security: require('./security'),
  tools: require('./tools')
};
var Money = payswarm.money.Money;
var BedrockError = payswarm.tools.BedrockError;

// constants
var MODULE_NS = payswarm.financial.namespace;

// module permissions
var PERMISSIONS = payswarm.config.permission.permissions;

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
 * gateway.
 *
 * If the main destination account is restricted from holding stored value,
 * and the deposit does not have a triggerReason, then
 * payswarm.financial.updateAccountBalanceSnapshot() must first be called on
 * the account. Its return values (in its callback) can be used to determine
 * the maximum deposit amount permitted.
 *
 * To process the Deposit, call processDeposit() after it has been
 * reviewed and found to be acceptable by the owner of the source account.
 *
 * @param actor the Identity performing the action.
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

      // ensure identity has access to destination account
      if(payees.length !== 1) {
        return callback(new BedrockError(
          'Invalid Deposit; a Deposit must have a single ' +
          'financial account Payee.', MODULE_NS + '.InvalidDeposit'));
      }

      // force payee into gateway group
      var payee = payees[0];
      jsonld.addValue(
        payee, 'payeeGroup', 'authority_gateway', {allowDuplicate: false});
      // FIXME: is adding a comment to the payee necessary?
      if(!('comment' in payee)) {
        payee.comment = 'Deposit';
      }
      payswarm.financial.getAccount(
        actor, payee.destination, function(err, account) {
          callback(err, account);
      });
    }],
    getCurrency: ['checkAccountAccess', function(callback, results) {
      if(options.verify && options.amounts) {
        // FIXME: if verification amounts exist then deposit MUST be all USD.
        return callback(null, 'USD');
      } else if(results.checkAccountAccess) {
        return callback(null, results.checkAccountAccess.currency);
      } else {
        // FIXME: can this happen?
        return callback(new BedrockError(
          'Invalid Deposit. No verification amounts or deposit account.',
          MODULE_NS + '.InvalidDeposit'));
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
        return callback(new BedrockError(
          'Invalid payment gateway.',
          MODULE_NS + '.InvalidPaymentGateway',
          {paymentGateway: gateway}));
      }
      // only permit active tokens
      if(source.sysStatus !== 'active') {
        return callback(new BedrockError(
          'Cannot perform deposit with an inactive payment method.',
          MODULE_NS + '.InactivePaymentToken',
          {paymentToken: source.id, 'public': true}));
      }
      // disallow unverified payment tokens unless this deposit is
      // for verification purposes itself
      if(!options.verify &&
        jsonld.hasValue(source, 'type', 'PaymentToken') &&
        !source.sysVerified) {
        return callback(new BedrockError(
          'Cannot perform deposit with an unverified payment method.',
          MODULE_NS + '.UnverifiedPaymentToken',
          {paymentToken: source.id, 'public': true}));
      }
      // FIXME: check payment token expiration date, if applicable
      callback();
    }],
    checkLimits: ['getCurrency', function(callback, results) {
      // skip limit check when actor is null or no payees and verifying
      if(actor === null) {
        return callback();
      }
      var payees = jsonld.getValues(deposit, 'payee');
      if(payees.length === 0 && options.verify && options.amounts) {
        return callback();
      }

      // get external payee amount and check against limits
      var payee = payees[0];
      var amount = new Money(payee.payeeRate);

      // check limits on exclusive amount
      var currency = results.getCurrency;
      var cfg = payswarm.config.financial.deposit;
      var min = cfg.limits[currency].minimum;
      if(amount.compareTo(min) < 0) {
        return callback(new BedrockError(
          'Minimum deposit amount is $' + min + '.',
          MODULE_NS + '.InvalidDeposit', {
            httpStatusCode: 400,
            'public': true
          }));
      }
      var max = cfg.limits[currency].maximum;
      if(amount.compareTo(max) > 0) {
        return callback(new BedrockError(
          'Maximum deposit amount is $' + max + '.',
          MODULE_NS + '.InvalidDeposit', {
            httpStatusCode: 400,
            'public': true
          }));
      }

      callback();
    }],
    // TODO: The gateway payee/transfer abstraction is not very clean and
    // requires this code to know a little too much about the internals of
    // what's going on with payment gateways, instead payment gateways should
    // generate Deposits (with transfers and all) based on basic inputs
    // like the amount to deposit and the account to deposit into
    addGatewayPayees: ['checkLimits', 'checkSource',
      function(callback) {
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
    adjustPrecision: ['createTransfers', function(callback) {
      var gateway = deposit.source.paymentGateway;
      gateway = payswarm.financial.paymentGateways[gateway];
      gateway.adjustDepositPrecision(deposit, callback);
    }],
    sign: ['adjustPrecision', function(callback) {
      // ensure no zero-total or negative transfers
      var total = Money.ZERO;
      var transfers = jsonld.getValues(deposit, 'transfer');
      for(var i = 0; i < transfers.length; ++i) {
        var transfer = transfers[i];
        var amount = new Money(transfer.amount);
        if(amount.isNegative()) {
          return callback(new BedrockError(
            'A Transfer does not have a valid amount.',
            MODULE_NS + '.InvalidDeposit', {transfer: transfer}));
        }
        total = total.add(amount);
      }

      if(total.isZero()) {
        return callback(new BedrockError(
          'The deposit total cannot be zero.',
          MODULE_NS + '.InvalidDeposit', {deposit: deposit}));
      }

      // assign date
      deposit.created = payswarm.tools.w3cDate();

      // sign deposit
      payswarm.financial.signTransaction(deposit, function(err, signed) {
        if(err) {
          return callback(new BedrockError(
            'The deposit could not be digitally signed. Please report this ' +
            'error.', MODULE_NS + '.DepositSignatureError',
            {'public': true, critical: true}, err));
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
 * @param actor the Identity performing the action. null if the actor should be
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
    return callback(new BedrockError(
      'Could not process Deposit; invalid payment gateway.',
      MODULE_NS + '.InvalidPaymentGateway', {gateway: gateway}));
  }
  gateway = payswarm.financial.paymentGateways[gateway];

  // ensure deposit has not expired yet
  var now = +new Date();
  var parsed = 0;
  try {
    parsed = +Date.parse(deposit.created);
  } catch(ex) {
    // ignore bad date format
  }
  if((now - parsed) > payswarm.config.financial.deposit.expiration) {
    return callback(new BedrockError(
      'Could not process Deposit; it has expired.',
      MODULE_NS + '.DepositExpired', {
        'public': true
      }));
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
        identity: emitOptions.results.getIdentity
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
        return callback(new BedrockError(
          'Could not process Deposit; it was not signed by the ' +
          'PaySwarm Authority.',
          MODULE_NS + '.InvalidDepositSigner'));
      }

      // verify signature
      payswarm.security.verifyJsonLd(deposit, key, function(err, verified) {
        if(!verified) {
          return callback(err || new BedrockError(
            'Could not process Deposit; its digital signature could not be ' +
            'verified which may indicate its contents have changed.',
            MODULE_NS + '.InvalidDepositSignature'));
        }
        // remove signature from deposit
        delete deposit.signature;
        callback();
      });
    }],
    getIdentity: ['verify', function(callback) {
      // FIXME: look up identity to send email ... this works if the
      // deposit was on the website, but in other cases it may send the
      // email to the wrong location, looking up the deposit identity
      // is difficult (look up each deposit account's identity and
      // send emails indicating a deposit of X amount occurred?)
      // FIXME: is this the right behavior?

      // if no actor specified, use authority identity
      var identityId = actor ? actor.id : payswarm.config.authority.id;
      payswarm.identity.getIdentity(null, identityId, function(err, identity) {
        callback(err, identity);
      });
    }],
    chargeSource: ['getIdentity', function(callback, results) {
      // if deposit uses CC, use HOLD+CAPTURE, otherwise regular charge
      var gatewayOp = gateway.chargeDepositSource;
      if(jsonld.hasValue(deposit.source, 'paymentMethod', 'CreditCard')) {
        gatewayOp = gateway.holdDepositFunds;
      }

      // run gateway op
      gatewayOp(deposit, function(err, result) {
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
            err = new BedrockError(
              'The deposit could not be approved. Please ensure that the ' +
              'information you entered is correct and try again.',
              MODULE_NS + '.DepositNotApproved',
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
          // Check for the error case of trying to do a deposit that would
          // result in stored value. Return this error as public.
          // This should only happen for credit cards.
          // FIXME: a specific error check here seems fragile
          if(err instanceof BedrockError &&
            err.hasType(MODULE_NS + '.AccountStoredValueProhibited')) {
            // Note: This should be a non-critical failure. Emitting an event
            // in order to track the issue.
            _emitEvent({
              type: 'common.Deposit.failure',
              results: results,
              error: err
            });
            // FIXME: use the found error vs making a new one?
            err = new BedrockError(
              'Deposit would result in stored value which is prohibited ' +
              'for this account.',
              MODULE_NS + '.AccountStoredValueProhibited',
              {id: deposit.id, 'public': true, httpStatusCode: 400});
            return callback(err);
          }

          err = new BedrockError(
            'Could not authorize a Transaction locally that was processed ' +
            'by a payment gateway.',
            MODULE_NS + '.TransactionConflict', {id: deposit.id}, err);

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
        } else if(jsonld.hasValue(src, 'paymentMethod', 'CreditCard')) {
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
