/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var rsa = require('rsa');
var jsonld = require('jsonld');
var util = require('util');
var payswarm = {
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools')
};

var api = {};
module.exports = api;

/**
 * Gets a hash on the given JSON-LD object. In order to hash a JSON-LD
 * object, it is first reframed (if a frame is provided) and then
 * normalized.
 *
 * @param obj the JSON-LD object to hash.
 * @param frame the frame to use to reframe the object (optional).
 *
 * @return the hash.
 */
api.hashJsonLd = function(obj, frame) {
  var rval = null;

  // compact using payswarm context
  var ctx = payswarm.tools.getDefaultJsonLdContext();
  obj = jsonld.compact(ctx, obj);

  // do reframing if frame supplied
  var reframed = obj;
  if(frame) {
    reframed = jsonld.frame(obj, frame);
  }

  // normalize and serialize
  var data = JSON.stringify(jsonld.normalize(reframed));

  // hash
  var md = crypto.createHash('sha1');
  md.update(data);
  rval = md.digest('hex');

  return rval;
};

/**
 * Signs a JSON-LD object. The object will be updated to be in the default
 * context and its signature will be stored under "sec:signature".
 *
 * @param obj the JSON-LD object to sign.
 * @param key the private key to sign with.
 * @param creator the URL to the paired public key.
 * @param nonce an optional nonce to include in the signature.
 * @param date an optional date to override the signature date with.
 * @param callback(err, obj) called once the operation completes.
 */
api.signJsonLd = function(obj, key, creator, nonce, date, callback) {
  // check key
  if(!('sec:privateKeyPem' in key)) {
    return callback(new payswarm.tools.PaySwarmError(
      'PrivateKey missing sec:privateKeyPem property.',
      'payswarm.security.InvalidPrivateKey'));
  }

  // compact using payswarm context
  var ctx = payswarm.tools.getDefaultJsonLdContext();
  obj = jsonld.compact(ctx, obj);

  // get created date
  var created = payswarm.tools.w3cDate(date);

  try {
    // create signature
    var signer = crypto.createSign('RSA-SHA1');
    if(nonce !== undefined && nonce !== null) {
      signer.update(nonce);
    }
    signer.update(created);
    signer.update(_getSignatureData(obj));
    var signature = signer.sign(key['sec:privateKeyPem'], 'base64');

    // set signature info
    var signInfo = {
      '@type': 'sec:JsonLdSignature',
      'dc:creator': creator,
      'dc:created': created,
      'sec:signatureValue': signature
    };
    if(nonce !== undefined && nonce !== null) {
      signInfo['sec:nonce'] = nonce;
    }

    // attach new signature info
    // FIXME: support multiple signatures
    obj['sec:signature'] = signInfo;
    callback(null, obj);
  }
  catch(e) {
    return callback(new payswarm.tools.PaySwarmError(
      'Could not sign JSON-LD.',
      'payswarm.security.SignError',
      {cause: e}));
  }
};

/**
 * Verifies a JSON-LD object.
 *
 * @param obj the JSON-LD object to verify the signature on.
 * @param key the public key to verify with.
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyJsonLd = function(obj, key, callback) {
  // FIXME: support multiple signatures
  if(!('sec:signature' in obj)) {
    return callback(new payswarm.tools.PaySwarmError(
      'Could not verify signature on object. Object is not signed.',
      'payswarm.security.InvalidSignature'));
  }

  if(!('sec:publicKeyPem' in key)) {
    return callback(payswarm.tools.PaySwarmError(
      'PublicKey missing sec:publicKeyPem property.',
      'payswarm.security.InvalidPublicKey'));
  }

  try {
    // verify signature
    var signInfo = obj['sec:signature'];
    var verifier = crypto.createVerify('RSA-SHA1');
    if('sec:nonce' in signInfo) {
      verifier.update(signInfo['sec:nonce']);
    }
    verifier.update(signInfo['dc:created']);
    verifier.update(_getSignatureData(obj));
    callback(null, verifier.verify(
      key['sec:publicKeyPem'], signInfo['sec:signatureValue'], 'base64'));
  }
  catch(e) {
    return callback(new payswarm.tools.PaySwarmError(
      'Could not verify JSON-LD.',
      'payswarm.security.VerifyError',
      {cause: e}));
  }
};

/**
 * Encrypts a JSON-LD object using a combination of public key and
 * symmetric key encryption.
 *
 * @param obj the JSON-LD object to encrypt.
 * @param publicKey the public key to encrypt with.
 * @param callback(err, msg) called once the operation completes.
 */
api.encryptJsonLd = function(obj, publicKey, callback) {
  // compact using a payswarm context if no context is present or the
  // context is not a string
  var compacted;
  if(!('@context' in obj && obj['@context'] instanceof String)) {
    var ctx = payswarm.tools.getDefaultJsonLdContext();
    compacted = jsonld.compact(ctx, obj);
  }
  else {
     // use already compact object
     compacted = obj;
  }

  // do message encryption
  async.waterfall([
    function generateKeyAndIv(callback) {
      crypto.randomBytes(32, function bytesReady(err, buf) {
        var key = buf.toString('binary', 0, 16);
        var iv = buf.toString('binary', 16);
        callback(null, key, iv);
      });
    },
    function encrypt(key, iv, callback) {
      try {
        // symmetric encrypt data
        var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        var encrypted = cipher.update(
          JSON.stringify(compacted), 'utf8', 'base64');
        encrypted += cipher.final('base64');

        // public key encrypt key and IV
        var keypair = rsa.createRsaKeypair({
          publicKey: publicKey['sec:publicKeyPem']
        });
        key = keypair.encrypt(key, 'binary', 'base64');
        iv = keypair.encrypt(iv, 'binary', 'base64');

        // create encrypted message
        var msg = {
          '@type': 'sec:EncryptedMessage',
          'sec:data': encrypted,
          'sec:algorithm': 'rsa-aes-128-cbc',
          'sec:encryptionKey': key,
          'sec:iv': iv,
          'sec:publicKey': publicKey['@id']
        };

        callback(null, msg);
      }
      catch(e) {
        callback(new payswarm.tools.PaySwarmError(
          'Could not encrypt message.',
          'payswarm.security.EncryptMessageError',
          {cause: e}));
      }
    }
  ], callback);
};

/**
 * Decrypts a JSON-LD object using a combination of private key and
 * symmetric key decryption.
 *
 * @param obj the JSON-LD object to decrypt.
 * @param privateKey the private key to decrypt with.
 * @param callback(err, msg) called once the operation completes.
 */
api.decryptJsonLd = function(obj, privateKey, callback) {
  // check algorithm
  if(obj['sec:algorithm'] !== 'rsa-aes-128-cbc') {
    return callback(new payswarm.tools.PaySwarmError(
      'The JSON-LD encrypted message algorithm is not supported.',
      'payswarm.security.UnsupportedAlgorithm',
      {'algorithm': obj['sec:algorithm']}));
  }

  // do message decryption
  async.waterfall([
    function decrypt(callback) {
      try {
        // private key decrypt key and IV
        var keypair = rsa.createRsaKeypair({
          privateKey: privateKey['sec:privateKeyPem']
        });
        var key = keypair.decrypt(
          obj['sec:encryptionKey'], 'base64', 'binary');
        var iv = keypair.decrypt(
          obj['sec:iv'], 'base64', 'binary');

        // symmetric decrypt data
        var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        var decrypted = decipher.update(obj['sec:data'], 'base64', 'utf8');
        decrypted += decipher.final('base64');
        var msg = JSON.parse(decrypted);

        callback(null, msg);
      }
      catch(e) {
        callback(new payswarm.tools.PaySwarmError(
          'Could not encrypt message.',
          'payswarm.security.EncryptMessageError',
          {cause: e}));
      }
    }
  ], callback);
};

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

/**
 * Creates a salted hash that can be used securely stored and used verify a
 * value at a later point in time.
 *
 * @param value the value to hash.
 * @param saltSize an optional salt size to use.
 * @param callback(err, hash) called once the operation completes.
 */
api.createSaltedHash = function(value, saltSize, callback) {
  saltSize = saltSize || 4;
  crypto.randomBytes(saltSize, function bytesReady(err, buf) {
    if(err) {
      callback(err);
    }
    else {
      // get salt
      var salt = buf.toString('hex');

      // hash value+salt
      var md = crypto.createHash('sha1');
      md.update(value + salt);
      var hex = md.digest('hex');

      // produce "SHA1:<hex salt>:<hex digest>" output
      var hash = util.format('SHA1:%s:%s', salt, hex);
      callback(null, hash);
    }
  });
};

/**
 * Verifies a value against a previously generated secure hash. The opaque
 * hash value should have been generated via createSaltedHash().
 *
 * @param value the value to verify.
 * @param hash the opaque hash value to verify against.
 * @param callback(err, verified) called once the operation completes.
 *
 * @return true if verified, false if not.
 */
api.verifySaltedHash = function(value, hash, callback) {
  var fields = hash.split(':');
  if(fields.length !== 3) {
    return callback(payswarm.tools.PaySwarmError(
      'Could not verify hashed value. Invalid input.',
      'payswarm.security.MalformedHash'));
  }

  // legacy password
  var verified = false;
  if(fields[0] === 'md5-1') {
    verified = _verifyLegacyPassword(value, fields[1], fields[2]);
  }
  else {
    // hash value+salt
    var md = crypto.createHash(fields[0]);
    md.update(value + fields[1]);
    var hex = md.digest('hex');
    verified = (hex === fields[2]);
  }

  callback(null, verified);
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
      md.update(salt + serverKey + encoded);
      var hex = md.digest('hex');
      rval = (hex === checksum);
   }

   return rval;
}

/**
 * Gets the data used to generate or verify a signature.
 *
 * @param obj the object to get the data for.
 *
 * @return the data.
 */
function _getSignatureData(obj) {
  var rval = null;

  // make sure the object has the default payswarm context
  var ctx = payswarm.tools.getDefaultJsonLdContext();
  var removeContext = false;
  if(!('@context' in obj)) {
    input = obj;
    input['@context'] = ctx;
    removeContext = true;
  }
  else {
    input = jsonld.compact(ctx, obj);
  }

  // remove signature field
  var tmp = null;
  if('sec:signature' in input) {
    tmp = input['sec:signature'];
    delete input['sec:signature'];
  }

  // normalize and serialize
  rval = JSON.stringify(jsonld.normalize(input));

  // remove context if it was added
  if(removeContext) {
    delete obj['@context'];
  }

  // replace signature field if removed
  if(tmp !== null) {
    input['sec:signature'] = tmp;
  }

  return rval;
}
