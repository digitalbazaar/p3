/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
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
 * Processes a financial Withdrawal. This method must be called before the
 * physical monetary transfer to the Withdrawal's external source.
 *
 * @param actor the profile performing the action.
 * @param withdrawal the Withdrawal to process.
 * @param options the withdrawal options.
 * @param callback(err) called once the operation completes.
 */
api.processWithdrawal = function(actor, withdrawal, options, callback) {
  // FIXME: implement me
};
