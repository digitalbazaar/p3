/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../../payswarm.config'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  tools: require('./payswarm.tools')
};

// constants
var MODULE_TYPE = 'payswarm.addressValidator';
var MODULE_IRI = 'https://payswarm.com/modules/address-validator';

// module permissions
var PERMISSIONS = {
  ADDRESS_VALIDATOR_ADMIN: MODULE_IRI + '#address_validator_admin',
  ADDRESS_VALIDATOR_ACCESS: MODULE_IRI + '#address_validator_access'
};

// module API
var api = {};
api.name = MODULE_TYPE + '.AddressValidator';
api.validator = null;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  // do initialization work
  async.waterfall([
    _registerPermissions,
    function initValidator(callback) {
      api.validator = require(payswarm.config.addressValidator.module);
      api.validator.init(callback);
    }
  ], callback);
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
      // check admin permission
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.ADDRESS_VALIDATOR_ADMIN, function(err) {
          if(err) {
            // check normal access permission
            return payswarm.profile.checkActorPermission(
              actor, PERMISSIONS.ADDRESS_VALIDATOR_ACCESS, callback);
          }
          callback();
        });
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
      // check admin permission
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.ADDRESS_VALIDATOR_ADMIN, function(err) {
          if(err) {
            // check normal access permission
            return payswarm.profile.checkActorPermission(
              actor, PERMISSIONS.ADDRESS_VALIDATOR_ACCESS, callback);
          }
          callback();
        });
    },
    function(callback) {
      api.validator.isAddressValidated(address, callback);
    }
  ], callback);
};

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    '@id': PERMISSIONS.ADDRESS_VALIDATOR_ADMIN,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Address Validator Administration',
    'rdfs:comment': 'Required to administer Address Validation.'
  }, {
    '@id': PERMISSIONS.ADDRESS_VALIDATOR_ACCESS,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Access Address Validator',
    'rdfs:comment': 'Required to access an Address Validator.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
