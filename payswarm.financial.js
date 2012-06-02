/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools')
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
 * Orders Payees according to their payeePosition.
 *
 * @param payees the Payees to order.
 *
 * @return the ordered Payees.
 */
// FIXME: remove if payees changed to use lists
api.sortPayees = function(payees) {
  if(!payees) {
    return [];
  }
  payees = Array.isArray(payees) ? payees : [payees];
  payees.sort(function(a, b) {
    var p1 = a['com:payeePosition'];
    var p2 = b['com:payeePosition'];
    return p1 < p2 ? -1 : (p1 > p2 ? 1 : 0);
  });
};

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
        transaction, privateKey, publicKey['@id'], callback);
  });
};

// load financial sub modules
payswarm.financial = {
  account: require('./payswarm.financial.account'),
  budget: require('./payswarm.financial.budget'),
  contract: require('./payswarm.financial.contract'),
  deposit: require('./payswarm.financial.deposit'),
  paymentToken: require('./payswarm.financial.paymentToken'),
  transaction: require('./payswarm.financial.transaction'),
  transfer: require('./payswarm.financial.transfer'),
  withdrawal: require('./payswarm.financial.withdrawal')
};

// add sub module apis
payswarm.tools.extend(
  api,
  // sub modules
  payswarm.financial.account,
  payswarm.financial.budget,
  payswarm.financial.paymentToken,
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
  async.waterfall([
    _loadPaymentGateways,
    payswarm.financial.account.init,
    payswarm.financial.budget.init,
    payswarm.financial.paymentToken.init,
    payswarm.financial.contract.init,
    payswarm.financial.deposit.init,
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
        api.paymentGateways[mod.name] = mod;
      }
      callback(err);
    });
  }, callback);
}
