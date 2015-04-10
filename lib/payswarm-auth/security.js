/*
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var bcrypt = require('bcrypt');
var bedrock = require('bedrock');
var crypto = require('crypto');
var BedrockError = bedrock.util.BedrockError;

// FIXME: bedrock security doesn't exist; use jsonld library for hashing
// and remove legacy code
var api = {};//bedrock.module('security');
module.exports = api;

/**
 * Verifies a password against a previously generated password hash. The
 * hash value should have been generated via createPasswordHash() or by
 * a supported legacy method.
 *
 * @param hash the hash value to verify against.
 * @param password the password to verify.
 * @param callback(err, verified, legacy) called once the operation completes.
 *
 * @return true if verified, false if not.
 */
api.verifyPasswordHash = function(hash, password, callback) {
  var fields = hash.split(':');
  if(fields.length !== 2 && fields.length !== 3) {
    return callback(new BedrockError(
      'Could not verify password hash. Invalid input.',
      'payswarm.security.MalformedPasswordHash'));
  }

  if(fields[0] === 'md5-1') {
    // legacy bitmunk hash
    var verified = _verifyLegacyPassword(password, fields[1], fields[2]);
    return callback(null, verified, true);
  }
  if(fields.length === 3) {
    // legacy salted hash
    // hash value+salt
    var md = crypto.createHash(fields[0]);
    md.update(password + fields[1], 'utf8');
    var hex = md.digest('hex');
    var verified = (hex === fields[2]);
    return callback(null, verified, true);
  }
  if(fields[0] === 'bcrypt') {
    // bcrypt hash
    return bcrypt.compare(password, fields[1], function(err, verified) {
      callback(err, verified, false);
    });
  }

  // unknown algorithm
  callback(new BedrockError(
    'Could not verify password hash. Invalid input.',
    'payswarm.security.MalformedPasswordHash'));
};

/**
 * Checks a password using the legacy bitmunk algorithm.
 *
 * @param password the password.
 * @param salt the salt.
 * @param checksum the checksum to compare against.
 *
 * @return true if verified, false if not.
 */
function _verifyLegacyPassword(password, salt, checksum) {
  var rval = false;

  // password length must be non-zero, 3 bytes or more
  var length = password.length;
  if(length >= 3) {
    // use first, middle, and last 2 characters of password
    var encoded = (
      password.substr(0, 2) +
      password.substr(length / 2, 2) +
      password.substr(length - 2, 2));

      // legacy server key
      var serverKey = 'j3k9w0h2nkJ1pLq8cnFdk4';

      var md = crypto.createHash('md5');
      md.update(salt + serverKey + encoded, 'utf8');
      var hex = md.digest('hex');
      rval = (hex === checksum);
   }

   return rval;
}

/**
 * Produces an identity hash for the given Identity.
 *
 * @param identity the identity.
 * @param hash used to store the identity hash (in hex).
 *
 * @return true on success, false on error with exception set.
 */
//static bool hashIdentity(Identity& identity, std::string& hash);

/**
 * Checks to see if the given Identity matches the given hash.
 *
 * @param identity the identity.
 * @param hash the identity hash (in hex).
 *
 * @return true on success, false on error with exception set.
 */
//static bool verifyIdentityHash(Identity& identity, const char* hash);
