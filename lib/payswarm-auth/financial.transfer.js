/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var payswarm = {
  financial: require('./financial'),
  logger: bedrock.loggers.get('app'),
  security: require('./security'),
  tools: require('./tools')
};

// constants
var MODULE_NS = payswarm.financial.namespace;

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

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
