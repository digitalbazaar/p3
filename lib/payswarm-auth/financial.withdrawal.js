/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
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
 * @param options the options to use.
 *          [verify] true if the withdrawal is for payment token verification,
 *            false if not (default: false).
 *          [noGatewayPayees] adds no gateway payees, used for payment token
 *            verification only (default: false).
 * @param callback(err, withdrawal) called once the operation completes.
 */
api.signWithdrawal = function(actor, withdrawal, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  async.auto({
    getSource: function(callback) {
      // populate withdrawal source
      payswarm.financial.getAccount(
        actor, withdrawal.source, function(err, account) {
          callback(err, account);
        });
    },
    getDestination: function(callback) {
      // ensure withdrawal payee destination is an external account
      var dstId = 'urn:payswarm-external-account';
      var payees = jsonld.getValues(withdrawal, 'payee');
      if(payees.length !== 1 || payees[0].destination !== dstId) {
        return callback(new PaySwarmError(
          'Invalid Withdrawal; a Withdrawal must have a single external ' +
          'financial account Payee.', MODULE_TYPE + '.InvalidWithdrawal'));
      }

      payswarm.tools.checkPayeeGroups(payees, function(err) {
        if(err) {
          return callback(err);
        }

        // force payee into gateway group
        jsonld.addValue(
          payees[0], 'payeeGroup', 'authority_gateway',
          {allowDuplicate: false});

        // populate withdrawal destination
        payswarm.financial.getPaymentToken(actor, withdrawal.destination,
          function(err, token) {
            callback(err, token);
        });
      });
    },
    checkDestination: ['getDestination', function(callback, results) {
      // set destination
      var dst = withdrawal.destination = results.getDestination;
      var gateway = dst.paymentGateway;
      if(!(gateway in payswarm.financial.paymentGateways)) {
        return callback(new PaySwarmError(
          'Invalid payment gateway.',
          MODULE_TYPE + '.InvalidPaymentGateway',
          {paymentGateway: gateway}));
      }
      // only permit active tokens
      if(dst.psaStatus !== 'active') {
        return callback(new PaySwarmError(
          'Cannot perform withdrawal with an inactive payment method.',
          MODULE_TYPE + '.InactivePaymentToken',
          {paymentToken: dst.id, 'public': true}));
      }
      // disallow unverified payment tokens unless this withdrawal is
      // for verification purposes itself
      if(!options.verify &&
        jsonld.hasValue(dst, 'type', 'com:PaymentToken') && !dst.psaVerified) {
        return callback(new PaySwarmError(
          'Cannot perform withdrawal with an unverified payment method.',
          MODULE_TYPE + '.UnverifiedPaymentToken',
          {paymentToken: dst.id, 'public': true}));
      }
      callback();
    }],
    checkLimits: ['getSource', 'checkDestination', function(callback, results) {
      // skip withdrawal limit check when verifying
      if(options.verify) {
        return callback();
      }

      // get external payee amount and check against limits
      var payees = jsonld.getValues(withdrawal, 'payee');
      var amount = payswarm.money.createExternalMoney(payees[0].payeeRate);

      // check limits on pre-inclusive amount
      var cfg = payswarm.config.financial.withdrawal;
      var min = cfg.limits[results.getSource.currency].minimum;
      if(amount.compareTo(min) < 0) {
        return callback(new PaySwarmError(
          'Minimum withdrawal amount is $' + min + '.',
          MODULE_TYPE + '.InvalidWithdrawal', {
            httpStatusCode: 400,
            'public': true
          }));
      }
      var max = cfg.limits[results.getSource.currency].maximum;
      if(amount.compareTo(max) > 0) {
        return callback(new PaySwarmError(
          'Maximum withdrawal amount is $' + max + '.',
          MODULE_TYPE + '.InvalidWithdrawal', {
            httpStatusCode: 400,
            'public': true
          }));
      }
      callback();
    }],
    addGatewayPayees: ['checkDestination', 'checkLimits',
      function(callback, results) {
      // skip gateway payees if specified
      if(options.noGatewayPayees) {
        return callback();
      }

      // add withdrawal payees for given gateway
      var gateway = withdrawal.destination.paymentGateway;
      gateway = payswarm.financial.paymentGateways[gateway];
      gateway.addWithdrawalPayees(withdrawal, callback);
    }],
    getId: function(callback) {
      // get a transaction ID for the withdrawal
      payswarm.financial.generateTransactionId(callback);
    },
    createTransfers: ['getSource', 'addGatewayPayees', 'getId',
      function(callback, results) {
      withdrawal.id = results.getId;
      var sourceId = results.getSource.id;
      var payees = jsonld.getValues(withdrawal, 'payee');
      payswarm.tools.createTransfers(withdrawal, sourceId, payees, callback);
    }],
    sign: ['createTransfers', function(callback, results) {
      // ensure no zero-amount for external destinations or negative transfers,
      // use external money factory function
      var original = payswarm.money.createExternalMoney(
        withdrawal.amount.toString());
      var total = payswarm.money.createExternalMoney(0);
      var transfers = jsonld.getValues(withdrawal, 'transfer');
      for(var i in transfers) {
        var transfer = transfers[i];
        var amount = payswarm.money.createExternalMoney(transfer.amount);
        if(amount.isNegative() ||
          (transfer.destination === 'urn:payswarm-external-account' &&
          amount.isZero())) {
          return callback(new PaySwarmError(
            'A Transfer does not have a valid amount.',
            MODULE_TYPE + '.InvalidWithdrawal', {transfer: transfer}));
        }
        // use external money amount, update total
        transfer.amount = amount.toString();
        total = total.add(amount);
      }

      // add difference in withdrawal total to external account transfer
      // (gives any extra rounding amounts to customer)
      var diff = original.subtract(total);
      for(var i in transfers) {
        var transfer = transfers[i];
        if(transfer.destination === 'urn:payswarm-external-account') {
          var amount = payswarm.money.createExternalMoney(transfer.amount);
          transfer.amount = amount.add(diff).toString();
          break;
        }
      }

      // set rounded original amount and assign date
      withdrawal.amount = original.toString();
      withdrawal.created = payswarm.tools.w3cDate();

      // sign withdrawal
      payswarm.financial.signTransaction(withdrawal, function(err, signed) {
        if(err) {
          return callback(new PaySwarmError(
            'The withdrawal could not be digitally signed. Please report ' +
            'this error.', MODULE_TYPE + '.WithdrawalSignatureError',
            {critical: true}, err));
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
 *          [verify] true if the withdrawal is for payment token verification,
 *            false if not (default: false).
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
    // include blinded withdrawal information if available
    if(emitOptions.results.blind) {
      event.details.withdrawal = emitOptions.results.blind;
    }
    // include external withdrawal amount
    if(emitOptions.results.getAmount) {
      event.details.amount = emitOptions.results.getAmount.toString();
    }
    // include extra details if given
    if(emitOptions.details) {
      payswarm.tools.extend(true, event.details, emitOptions.details);
    }

    payswarm.events.emit(event);
  }

  async.auto({
    getAmount: function(callback) {
      // get external withdrawal amount to external account
      var amount = payswarm.money.createExternalMoney();
      var transfers = jsonld.getValues(withdrawal, 'transfer');
      transfers.forEach(function(transfer) {
        if(transfer.destination === 'urn:payswarm-external-account') {
          amount = amount.add(transfer.amount);
        }
      });
      callback(null, amount);
    },
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
      // set temporary psaSettleAfter to 10 days from now, to be
      // overwritten below by the payment gateway
      withdrawal.psaSettleAfter = (+new Date() + 1000*60*60*24*10);

      // authorize the transaction locally
      payswarm.financial.authorizeTransaction(withdrawal, callback);
    }],
    getIdentity: ['verify', function(callback) {
      // get owner of destination account
      var identityId = withdrawal.destination.owner;
      payswarm.identity.getIdentity(null, identityId, function(err, identity) {
        callback(err, identity);
      });
    }],
    getProfile: ['getIdentity', function(callback, results) {
      // get profile owner of identity in order to send email
      var profileId = results.getIdentity.owner;
      payswarm.profile.getProfile(null, profileId, function(err, profile) {
        callback(err, profile);
      });
    }],
    creditDestination: ['getAmount', 'authorize', function(callback, results) {
      // credit destination via gateway
      gateway.creditWithdrawalDestination(
        withdrawal, results.getAmount, function(err, result) {
        if(err) {
          return gateway.blindWithdrawal(withdrawal, function(blindErr, blind) {
            if(blindErr) {
              payswarm.logging.error('Error blinding withdrawal.', {
                id: withdrawal.id,
                error: blindErr
              });
              // fake the blind result
              blind = {id: withdrawal.id};
            }

            var httpStatusCode = 500;
            if(err.name === 'payswarm.paymentGateway.Declined') {
              payswarm.financial.voidTransaction(withdrawal.id, {
                voidReason: err.name
              }, function(err) {
                if(err) {
                  payswarm.logger.error('Error voiding declined withdrawal.', {
                    withdrawal: blind,
                    error: err
                  });
                }
              });
              httpStatusCode = 400;
            }

            err = new PaySwarmError(
              'The withdrawal could not be approved. Please ensure that the ' +
              'information you entered is correct and try again.',
              MODULE_TYPE + '.WithdrawalNotApproved',
              {'public': true,
                httpStatusCode: httpStatusCode, id: withdrawal.id},
              err);

            // emit withdrawal failure event, include blind in async results
            results.blind = blind;
            _emitEvent({
              type: 'common.Withdrawal.failure',
              results: results,
              error: err
            });

            callback(err);
          });
        }
        callback();
      });
    }],
    blind: ['creditDestination', function(callback) {
      gateway.blindWithdrawal(withdrawal, callback);
    }],
    gatewayWithdrawalNotify: ['blind', function(callback, results) {
      // emit an event that can be used to track that a successful gateway
      // withdrawal is associated with a successful internal withdrawal
      _emitEvent({
        type: 'common.Withdrawal.gatewaySuccess',
        results: results,
        details: {
          stage: 'gateway'
        }
      });
      callback();
    }],
    updateTransaction: ['gatewayWithdrawalNotify', function(callback) {
      // add gateway approval code and/or reference ID
      var update = {
        $set: {'transaction.psaSettleAfter': withdrawal.psaSettleAfter}
      };
      if('psaGatewayApprovalCode' in withdrawal) {
        update.$set['transaction.psaGatewayApprovalCode'] =
          withdrawal.psaGatewayApprovalCode;
      }
      if('psaGatewayRefId' in withdrawal) {
        update.$set['transaction.psaGatewayRefId'] =
          withdrawal.psaGatewayRefId;
      }

      // update settleAfter and annotate withdrawal w/gateway info
      update.$set['meta.updated'] = +new Date();
      payswarm.db.collections.transaction.update(
        {id: payswarm.db.hash(withdrawal.id)},
        update, payswarm.db.writeOptions, function(err) {
          callback(err);
        });
    }],
    notify: ['getProfile', 'updateTransaction', function(callback, results) {
      var blinded = results.blind;

      // emit withdrawal success and logging events
      _emitEvent({
        type: (options.verify ?
          'common.Withdrawal.successForVerify' : 'common.Withdrawal.success'),
        results: results,
        details: {
          stage: 'authority'
        }
      });
      var dst = blinded.destination;
      if(jsonld.hasValue(dst, 'paymentMethod', 'bank:BankAccount')) {
        _emitEvent({
          type: 'common.Withdrawal.ach-merchant-account-log',
          results: results
        });
      }
      callback(null, blinded);
    }]
  }, function(err, results) {
    callback(err, results ? results.notify : null);
  });
};
