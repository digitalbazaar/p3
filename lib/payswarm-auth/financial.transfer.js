/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  db: require('bedrock-mongodb'),
  financial: require('./financial'),
  identity: require('bedrock-identity'),
  logger: bedrock.loggers.get('app'),
  security: require('./security'),
  tools: require('./tools')
};

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
 * Processes a financial Transaction containing a list of financial
 * Transfers. The transaction ID will be generated and assigned by this
 * method.
 *
 * @param actor the Identity performing the action.
 * @param transaction the Transaction to process.
 * @param options the transfer options.
 * @param callback(err) called once the operation completes.
 */
api.processTransfer = function(actor, transaction, options, callback) {
  // FIXME: implement me
};
