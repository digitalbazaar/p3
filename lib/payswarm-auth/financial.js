/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  authority: require('./authority'),
  config: bedrock.config,
  db: bedrock.modules['bedrock.database'],
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  security: require('./security'),
  tools: require('./tools')
};
var BedrockError = payswarm.tools.PaySwarmError;

// constants
var MODULE_NS = 'payswarm.financial';

// module API
var api = {};
api.name = MODULE_NS;
api.namespace = MODULE_NS;
module.exports = api;

// payment gateways
api.paymentGateways = {};

/**
 * Signs a Transaction using an authority key-pair.
 *
 * @param transaction the Transaction to sign.
 * @param callback(err, signed) called once the operation completes.
 */
api.signTransaction = function(transaction, callback) {
  // get key-pair without permission check
  payswarm.authority.getAuthorityKeyPair(null,
    function(err, publicKey, privateKey) {
      if(err) {
        return callback(err);
      }
      payswarm.security.signJsonLd(transaction, {
        key: privateKey,
        creator: publicKey.id
      }, callback);
  });
};

/**
 * Verify a Transaction is signed and return signer info.
 *
 * @param transaction the Transaction to verify.
 * @param [options]:
 *          [signer]: required identity of key owner
 * @param callback(err, info) called once the operation completes.
 *          info:
 *            profile: {...}
 *            identity: {...}
 */
api.verifyTransaction = function(transaction, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  async.auto({
    signature: function(callback) {
      // check signature exists and return it
      // input validators will have already checked signature format
      if(!transaction.signature) {
        return callback(new BedrockError(
          'Could not process transaction; it was not signed.',
          MODULE_NS + '.MissingSignature'));
      }
      callback(null, transaction.signature);
    },
    publicKey: function(callback, results) {
      // get signature public key
      var key = {
        id: results.signature.creator
      };
      payswarm.identity.getIdentityPublicKey(key, function(err, publicKey) {
        callback(err, publicKey);
      });
    },
    checkSigner: ['publicKey', function(callback, results) {
      // optionally ensure signer owns the key
      if(options.signer && (results.publicKey.owner !== options.signer)) {
        return callback(new BedrockError(
          'Could not process transaction; it was not signed by the ' +
          'correct signer.',
          MODULE_NS + '.InvalidSigner'));
      }
      callback();
    }],
    verify: ['checkSigner', function(callback, results) {
      // verify signature
      payswarm.security.verifyJsonLd(
        transaction, results.publicKey, function(err, verified) {
        if(!verified) {
          return callback(err || new BedrockError(
            'Digital signature of transaction could not be verified.',
            MODULE_NS + '.InvalidSignature'));
        }
        callback();
      });
    }],
    identity: ['verify', function(callback, results) {
      // get identity without permission check
      payswarm.identity.getIdentity(
        null, results.publicKey.owner, function(err, identity) {
          callback(err, identity);
        });
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    callback(err, {
      identity: results.identity
    });
  });
};

// load financial sub modules
payswarm.financial = {
  account: require('./financial.account'),
  budget: require('./financial.budget'),
  paymentToken: require('./financial.paymentToken'),
  transaction: require('./financial.transaction'),
  contract: require('./financial.contract'),
  deposit: require('./financial.deposit'),
  transfer: require('./financial.transfer'),
  withdrawal: require('./financial.withdrawal')
};

// add sub module apis
payswarm.tools.extend(
  api,
  // sub modules
  payswarm.financial.account,
  payswarm.financial.budget,
  payswarm.financial.paymentToken,
  payswarm.financial.transaction,
  payswarm.financial.contract,
  payswarm.financial.deposit,
  payswarm.financial.transfer,
  payswarm.financial.withdrawal
);

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  // NOTE: init dependency order is important
  async.waterfall([
    _loadPaymentGateways,
    payswarm.financial.transaction.init,
    payswarm.financial.deposit.init,
    payswarm.financial.budget.init,
    payswarm.financial.paymentToken.init,
    payswarm.financial.account.init,
    payswarm.financial.contract.init,
    payswarm.financial.transfer.init,
    payswarm.financial.withdrawal.init
  ], callback);
};

/**
 * Loads all payment gateways specified in the configuration.
 *
 * @param callback(err) called once the operation completes.
 */
function _loadPaymentGateways(callback) {
  var gateways = payswarm.config.financial.paymentGateways;
  async.forEachSeries(gateways, function(gateway, callback) {
    var mod = require(gateway);
    mod.init(function(err) {
      if(!err) {
        api.paymentGateways[mod.gatewayName] = mod;
      }
      callback(err);
    });
  }, callback);
}
