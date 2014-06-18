/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app')
};

// constants
var MODULE_NS = 'payswarm.addressValidator';

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// module API
var api = {};
api.name = MODULE_NS;
api.validator = null;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  api.validator = require(payswarm.config.addressValidator.module);
  api.validator.init(callback);
};

/**
 * Validates an Address.
 *
 * @param actor the profile performing the action.
 * @param address the Address to validate.
 * @param callback(err, address) called once the operation completes.
 */
api.validateAddress = function(actor, address, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.ADDRESS_VALIDATOR_ACCESS, callback);
    },
    function(callback) {
      api.validator.validateAddress(address, callback);
    }
  ], callback);
};

/**
 * Determines if the given Address has been previously validated.
 *
 * @param actor the profile performing the action.
 * @param address the Address to check.
 * @param callback(err, validated) called once the operation completes.
 */
api.isAddressValidated = function(actor, address, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.ADDRESS_VALIDATOR_ACCESS, callback);
    },
    function(callback) {
      api.validator.isAddressValidated(address, callback);
    }
  ], callback);
};
