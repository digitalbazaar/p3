/*
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
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
 * Gets the regulations associated with the given regulatory address.
 *
 * @param actor the Identity performing the action.
 * @param options the options to use.
 *          address the regulatory address.
 * @param callback(err) called once the operation completes.
 */
api.getRegulations = function(actor, options, callback) {
  // TODO: how this system will be designed (as of now):
  // 1. when setting a regulatory address, look up all the regulations
  // that might possibly apply and make a regulation JSON-LD blob for them
  // 2. JSON-LD hash that blob to get an identifier for it and put it and
  // the blob in the DB
  // 3. Store the identifier with all applicable financial accounts
  // 4. When it's time to do a txn, use the regulation ID from the account
  // to look up regulations in the DB and then do whatever crazy stuff is
  // required by the regulations ... check whatever based on whatever
  // inputs are available, etc.
  // 5. If regulations pass, do the txn, etc. ... same situation might
  // apply during txn settlement, need to check regs again maybe or something

  // TODO: implement me
  callback(null, {
    id: 'urn:regulation:unregulated'
  });
};
