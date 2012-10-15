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
      // FIXME: what should the destination ID be here?
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
      if(!(gateway in payswarm.config.financial.paymentGateway)) {
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
    addGatewayPayees: ['checkDestination', function(callback, results) {
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
    sign: ['createTransfers', function(callback) {
      // ensure no zero-amount or negative transfers, use external money
      // factory function
      var total = payswarm.money.createExternalMoney(0);
      var transfers = jsonld.getValues(withdrawal, 'transfer');
      for(var i in transfers) {
        var transfer = transfers[i];
        var amount = payswarm.money.createExternalMoney(transfer.amount);
        if(amount.isZero() || amount.isNegative()) {
          return callback(new PaySwarmError(
            'A Transfer does not have a valid amount.',
            MODULE_TYPE + '.InvalidWithdrawal', {transfer: transfer}));
        }
        // use external money amount, update total
        transfer.amount = amount.toString();
        total = total.add(amount);
      }

      // set new rounded total and assign date
      withdrawal.amount = total.toString();
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
          payswarm.events.emit(payswarm.tools.clone(event));
          return callback(err);
        }

        // FIXME: emit event that external withdrawal happened so we
        // can track it internally

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
      payswarm.events.emit(event);
      var dst = blinded.destination;
      if(jsonld.hasValue(dst, 'paymentMethod', 'bank:BankAccount')) {
        event.type = 'common.Withdrawal.ach-merchant-account-log';
        payswarm.events.emit(event);
      }
      callback(null, blinded);
    }]
  }, function(err, results) {
    callback(err, results ? results.notify : null);
  });
};
