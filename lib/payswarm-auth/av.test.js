/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var crypto = require('crypto');
var payswarm = {
  config: require('../config'),
  logger: require('./loggers').get('app'),
  security: require('./security'),
  tools: require('./tools')
};

// constants
var MODULE_TYPE = 'payswarm.addressValidator';

// test address validator module API
var api = {};
api.name = MODULE_TYPE + '.Test';
module.exports = api;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  callback(null);
};

/**
 * Validates an Address.
 *
 * @param address the Address to validate.
 * @param callback(err, address) called once the operation completes.
 */
api.validateAddress = function(address, callback) {
  // set out address to pre-defined test values
  var out = payswarm.tools.clone(
    payswarm.config.addressValidator.test.address);
  out.fullName = payswarm.tools.clone(address.fullName);

  // produce validation hash
  _hashAddress(out, function(err, hash) {
    if(err) {
      return callback(err);
    }
    out.psaAddressHash = hash;
    out.psaValidated = true;
    callback(null, out);
  });
};

/**
 * Determines if the given Address has been previously validated.
 *
 * @param address the Address to check.
 * @param callback(err, validated) called once the operation completes.
 */
api.isAddressValidated = function(address, callback) {
  if(address.psaValidated === true) {
    _hashAddress(address, function(err, hash) {
      if(err) {
        return callback(err);
      }
      callback(null, address.psaAddressHash === hash);
    });
  }
  else {
    callback(null, false);
  }
};

/**
 * Produces a validation hash for an address.
 *
 * @param address the address to hash.
 * @param callback(err, hash) called once the operation completes.
 */
function _hashAddress(address, callback) {
  var md = crypto.createHash('sha1');
  md.update(payswarm.config.addressValidator.test.key, 'utf8');
  payswarm.security.hashJsonLd(address, function(err, hash) {
    if(err) {
      return callback(err);
    }
    md.update(hash, 'utf8');
    callback(null, md.digest('hex'));
  });
}
