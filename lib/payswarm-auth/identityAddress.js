/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var payswarm = {
  logger: bedrock.loggers.get('app'),
  tools: require('./tools')
};
var util = require('util');
var BedrockError = payswarm.tools.BedrockError;

// constants
var MODULE_NS = 'payswarm.identityAddress';

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// module API
var api = {};
api.name = MODULE_NS;
api.validator = null;
module.exports = api;

// distributed ID generator
var addressIdGenerator = null;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  async.waterfall([
    function(callback) {
      api.validator = require(bedrock.config.addressValidator.module);
      api.validator.init(callback);
    },
    function(callback) {
      brDatabase.getDistributedIdGenerator('address',
        function(err, idGenerator) {
          if(!err) {
            addressIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
};

/**
 * Creates an Address ID from the given Identity ID and Address slug.
 *
 * @param ownerId the Identity ID.
 * @param name the short Address name (slug).
 *
 * @return the Address ID.
 */
api.createAddressId = function(ownerId, name) {
  return util.format('%s/addresses/%s', ownerId, encodeURIComponent(name));
};

/**
 * Creates a new AddressId based on the owner's IdentityId.
 *
 * @param ownerId the ID of the Identity that owns the Address.
 * @param callback(err, id) called once the operation completes.
 */
api.generateAddressId = function(ownerId, callback) {
  addressIdGenerator.generateId(function(err, id) {
    if(err) {
      return callback(err);
    }
    callback(null, api.createAddressId(ownerId, id));
  });
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
      brIdentity.checkPermission(
        actor, PERMISSIONS.IDENTITY_EDIT, {resource: id}, callback);
    },
    function(callback) {
      brDatabase.collections.identity.update(
        {id: brDatabase.hash(id)},
        {$push: {'identity.address': address}},
        brDatabase.writeOptions, callback);
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
api.getIdentityAddresses = function(actor, identityId, callback) {
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.IDENTITY_ACCESS, {resource: identityId}, callback);
    },
    function(callback) {
      brDatabase.collections.identity.find(
        {id: brDatabase.hash(identityId)},
        {'identity.address': true}).toArray(callback);
    },
    function(records, callback) {
      if(records.length === 0) {
        return callback(new BedrockError(
          'Identity not found.',
          MODULE_NS + '.IdentityNotFound',
          {id: id, httpStatusCode: 404, 'public': true}));
      }
      var addresses = bedrock.jsonld.getValues(records[0].identity, 'address');
      callback(null, addresses);
    }
  ], callback);
};

/**
 * Retrieves an Identity Address.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Address to retrieve.
 * @param callback(err, address) called once the operation completes.
 */
api.getIdentityAddress = function(actor, addressId, callback) {
  var identityId = _identityIdForAddressId(addressId);
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.IDENTITY_ACCESS, {resource: identityId}, callback);
    },
    function(callback) {
      api.getIdentityAddresses(actor, identityId, callback);
    },
    function(addresses, callback) {
      for(var i = 0; i < addresses.length; ++i) {
        var address = addresses[i];
        if(address.id === addressId) {
          return callback(null, address);
        }
      }
      callback(new BedrockError(
        'Address not found.',
        MODULE_NS + '.AddressNotFound',
        {id: addressId, httpStatusCode: 404, 'public': true}));
    }
  ], callback);
};

/**
 * Update an existing Identity Address. Use this method to change Address
 * properties.
 *
 * @param actor the Identity performing the action.
 * @param addressUpdate the Address with id and fields to update.
 * @param callback(err) called once the operation completes.
 */
api.updateIdentityAddress = function(actor, addressUpdate, callback) {
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.IDENTITY_EDIT, {
          resource: addressUpdate,
          translate: 'owner',
          get: _getIdentityAddressForPermissionCheck
        }, callback);
    },
    function(callback) {
      // only include changable fields
      // not using buildUpdate due to array usage
      // FIXME: update buildUpdate to handle this or normalize address data
      var setUpdate = {};
      if('label' in addressUpdate) {
        setUpdate['identity.address.$.label'] = addressUpdate.label;
      }
      brDatabase.collections.identity.update(
        {
          id: brDatabase.hash(_identityIdForAddressId(addressUpdate.id)),
          'identity.address.id': addressUpdate.id
        },
        {$set: setUpdate},
        brDatabase.writeOptions, callback);
    }
  ], function(err, results) {
    callback(err);
  });
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
      brIdentity.checkPermission(
        actor, PERMISSIONS.IDENTITY_EDIT, {resource: id}, callback);
    },
    function(callback) {
      brDatabase.collections.identity.update(
        {id: brDatabase.hash(id)},
        {$pull: {'identity.address': {id: addressId}}},
        brDatabase.writeOptions,
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
      brIdentity.checkPermission(
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
      brIdentity.checkPermission(
        actor, PERMISSIONS.ADDRESS_VALIDATOR_ACCESS,
        {resource: actor}, callback);
    },
    function(callback) {
      api.validator.isAddressValidated(address, callback);
    }
  ], callback);
};

/**
 * Get the identity id from an address id.
 */
function _identityIdForAddressId(addressId) {
  // FIXME: improve this identityId extraction?
  // may just eliminate this need by switching to dedicated address collection
  return addressId.split('/').slice(0,-2).join('/');
}

/**
 * Gets an Identity during a permission check.
 *
 * @param address the Address to get.
 * @param options the options to use.
 * @param callback(err, address) called once the operation completes.
 */
function _getIdentityAddressForPermissionCheck(address, options, callback) {
  if(typeof address === 'object') {
    address = address.id || '';
  }
  api.getIdentityAddress(null, address, function(err, address) {
    callback(err, address);
  });
}
