/*
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var payswarm = {
  authority: require('./authority'),
  security: require('./security')
};
var BedrockError = bedrock.util.BedrockError;

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
      brIdentity.getIdentityPublicKey(key, function(err, publicKey) {
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
      brIdentity.getIdentity(
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

bedrock.events.on('bedrock.start', function(callback) {
  // NOTE: init dependency order is important
  async.waterfall([
    _loadPaymentGateways,
    // FIXME: temporary hack to fix payment token creation, cleaner event
    // design required
    bedrock.events.emit.bind(bedrock.events, 'p3-financial.init')/*,
    payswarm.financial.regulation.init,
    payswarm.financial.transaction.init,
    payswarm.financial.deposit.init,
    payswarm.financial.budget.init,
    payswarm.financial.paymentToken.init,
    payswarm.financial.account.init,
    payswarm.financial.contract.init,
    payswarm.financial.transfer.init,
    payswarm.financial.withdrawal.init*/
  ], function(err) {
    callback(err);
  });
});

// load financial sub modules
payswarm.financial = {
  regulation: require('./financial.regulation'),
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
bedrock.util.extend(
  api,
  // sub modules
  payswarm.financial.regulation,
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
 * Loads all payment gateways specified in the configuration.
 *
 * @param callback(err) called once the operation completes.
 */
function _loadPaymentGateways(callback) {
  var gateways = bedrock.config.financial.paymentGateways;
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
