/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.module('config'),
  db: bedrock.module('bedrock.database'),
  financial: require('./financial'),
  identity: bedrock.module('bedrock.identity'),
  logger: bedrock.module('loggers').get('app'),
  tools: require('./tools')
};
var BedrockError = payswarm.tools.BedrockError;

// constants
var MODULE_NS = 'payswarm.identityAddress';

// module permissions
var PERMISSIONS = payswarm.config.permission.permissions;

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
 * Adds an Address to an Identity.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Identity to update.
 * @param address the Address to add to the Identity.
 * @param callback(err) called once the operations completes.
 */
api.addIdentityAddress = function(actor, id, address, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.IDENTITY_EDIT, {resource: id}, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.update(
        {id: payswarm.db.hash(id)},
        {$push: {'identity.address': address}},
        payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        return callback(new BedrockError(
          'Could not add address to Identity. Identity not found.',
          MODULE_NS + '.IdentityNotFound'));
      }
      callback();
    }
  ], callback);
};

/**
 * Retrieves an Identity's Addresses.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Identity to retrieve the addresses for.
 * @param callback(err, addresses) called once the operation completes.
 */
api.getIdentityAddresses = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.IDENTITY_ACCESS, {resource: id}, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.find(
        {id: payswarm.db.hash(id)},
        {'identity.address': true}).toArray(callback);
    },
    function(records, callback) {
      var addresses = [];
      records.forEach(function(record) {
        addresses.push(record.identity.address);
      });
      callback(null, addresses);
    }
  ], callback);
};

/**
 * Removes an Identity's Address.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Identity to remove the address for.
 * @param addressId the address id to remove.
 *          (Note: Currently the id is the label.)
 * @param callback(err) called once the operation completes.
 */
api.removeIdentityAddress = function(actor, id, addressId, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.IDENTITY_EDIT, {resource: id}, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.update(
        {id: payswarm.db.hash(id)},
        {$pull: {'identity.address': {label: addressId}}},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Validates an Address.
 *
 * @param actor the Identity performing the action.
 * @param address the Address to validate.
 * @param callback(err, address) called once the operation completes.
 */
api.validateAddress = function(actor, address, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.ADDRESS_VALIDATOR_ACCESS,
        {resource: actor}, callback);
    },
    function(callback) {
      api.validator.validateAddress(address, callback);
    }
  ], callback);
};

/**
 * Determines if the given Address has been previously validated.
 *
 * @param actor the Identity performing the action.
 * @param address the Address to check.
 * @param callback(err, validated) called once the operation completes.
 */
api.isAddressValidated = function(actor, address, callback) {
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.ADDRESS_VALIDATOR_ACCESS,
        {resource: actor}, callback);
    },
    function(callback) {
      api.validator.isAddressValidated(address, callback);
    }
  ], callback);
};

/**
 * Sets an Identity' regulatory address. This address is used to indicate
 * the primary residence or place of business.
 *
 * @param actor the Identity performing the action.
 * @param options the options to use.
 *          id the ID of the Identity to update.
 *          address the regulatory Address to set for the Identity.
 *          [account] an optional FinancialAccount to create.
 * @param callback(err) called once the operations completes.
 */
api.setIdentityRegulatoryAddress = function(actor, options, callback) {
  // TODO: check/validate address against regulatory framework API
  // TODO: do add account if options.account is set, ensure its initial status
  //   is restricted
  // TODO: set all "active" financial accounts to "restricted" for id
  // TODO: update identity.sysRegulatoryAddress
  // TODO: update all accounts to new regulatory framework, including
  //   any disabled or deleted accounts?
  // TODO: set all "restricted" financial accounts to "active", use update ID
  //   to ensure no other changes occurred (synchronize)

  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.IDENTITY_EDIT, {resource: options.id}, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.update(
        {id: payswarm.db.hash(options.id)},
        {$push: {'identity.sysRegulatoryAddress': options.address}},
        payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        return callback(new BedrockError(
          'Could not set Identity\'s regulatory address. Identity not found.',
          MODULE_NS + '.IdentityNotFound'));
      }
      callback();
    }
  ], callback);
};
