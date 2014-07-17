/*
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.module('config'),
  db: bedrock.module('bedrock.database'),
  financial: require('./financial'),
  identity: bedrock.module('bedrock.identity'),
  logger: bedrock.module('loggers').get('app'),
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
 * Gets the regulations associated with the given regulatory address.
 *
 * @param actor the Identity performing the action.
 * @param options the options to use.
 *          address the regulatory address.
 * @param callback(err) called once the operation completes.
 */
api.getRegulations = function(actor, options, callback) {
  // TODO: implement me
  callback(null, {
    id: 'urn:regulation:unregulated'
  });
};
