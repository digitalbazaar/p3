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
 * Processes a financial Transaction containing a list of financial
 * Transfers. The transaction ID will be generated and assigned by this
 * method.
 *
 * @param actor the Profile performing the action.
 * @param transaction the Transaction to process.
 * @param options the transfer options.
 * @param callback(err) called once the operation completes.
 */
api.processTransfer = function(actor, transaction, options, callback) {
  // FIXME: implement me
};
