/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var crypto = require('crypto');
var request = require('request');
var URL = require('url');
var payswarm = {
  config: require('../config'),
  logger: require('./loggers').get('app'),
  security: require('./security'),
  tools: require('./tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.addressValidator';

// test address validator module API
var api = {};
api.name = MODULE_TYPE + '.Yahoo';
module.exports = api;

var PLACE_FINDER_URL = URL.parse('http://where.yahooapis.com/geocode');

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
  // create PlaceFinder url
  var url = payswarm.tools.clone(PLACE_FINDER_URL);
  url.query = {
    street: address.streetAddress,
    city: address.locality,
    state: address.region,
    postal: address.postalCode,
    country: address.countryName,
    flags: 'J',
    appid: payswarm.config.addressValidator.yahoo.applicationId
  };
  request(URL.format(url), function(err, res, body) {
    // parse body
    if(!err) {
      try {
        body = JSON.parse(body);
        if(!body.ResultSet || typeof body.ResultSet !== 'object') {
          err = new PaySwarmError(
            'Invalid response from API.',
            MODULE_TYPE + '.InvalidResponse', {response: body});
        }
        else if(body.ResultSet.Error.toString() !== '0') {
          err = new PaySwarmError(body.ResultSet.ErrorMessage);
        }
      }
      catch(ex) {
        err = ex;
      }
    }
    if(err) {
      return callback(new PaySwarmError(
        'Yahoo PlaceFinder API error.',
        MODULE_TYPE + '.Error', null, err));
    }

    // get first result (best match)
    var result = body.ResultSet.Results[0];
    var out = {
      type: 'vcard:Address',
      label: address.label || 'Default',
      fullName: address.fullName || '',
      streetAddress: result.line1,
      locality: result.city,
      region: result.statecode,
      postalCode: result.postal,
      countryName: result.countrycode
    };

    // ensure all fields are set
    if(out.streetAddress &&
      out.locality &&
      out.region &&
      out.postalCode &&
      out.countryName) {
      // produce validation hash
      return _hashAddress(out, function(err, hash) {
        if(err) {
          return callback(err);
        }
        out.psaAddressHash = hash;
        out.psaValidated = true;
        callback(null, out);
      });
    }
    // return unvalidated address
    out.psaValidated = false;
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
  md.update(payswarm.config.addressValidator.yahoo.key, 'utf8');
  payswarm.security.hashJsonLd(address, function(err, hash) {
    if(err) {
      return callback(err);
    }
    md.update(hash, 'utf8');
    callback(null, md.digest('hex'));
  });
}
