/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security')
};

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
 * Validates and signs a financial Deposit. This method will not actually
 * process the Deposit, it will not be submitted to any external payment
 * gateway. To process the Deposit, call processDeposit() after it has been
 * reviewed and found to be acceptable by the owner of the source account.
 *
 * @param actor the Profile performing the action.
 * @param deposit the Deposit to sign.
 * @param callback(err, deposit) called once the operation completes.
 */
api.signDeposit = function(actor, deposit, callback) {
  // FIXME: implement me
};

/**
 * Processes a signed financial Deposit. This method must only be called
 * after signDeposit().
 *
 * @param actor the Profile performing the action.
 * @param deposit the Deposit to process.
 * @param options:
 *          escrowType: the escrow type to use (EscrowNone or EscrowReceive).
 * @param callback(err, deposit) called once the operation completes.
 */
api.processDeposit = function(actor, deposit, options, callback) {
  // FIXME: implement me
};
