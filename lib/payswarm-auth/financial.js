/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  permission: require('./permission'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools')
};

// constants
var MODULE_TYPE = 'payswarm.financial';
var MODULE_IRI = 'https://payswarm.com/modules/financial';

// module API
var api = {};
api.name = MODULE_TYPE + '.Financial';
api.type = MODULE_TYPE;
api.iri = MODULE_IRI;
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
  payswarm.identity.getAuthorityKeyPair(null,
    function(err, publicKey, privateKey) {
      if(err) {
        return callback(err);
      }
      payswarm.security.signJsonLd(
        transaction, privateKey, publicKey.id, callback);
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
