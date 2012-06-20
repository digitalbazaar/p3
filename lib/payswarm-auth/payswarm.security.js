/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var rsa = require('rsa');
var util = require('util');
var jsonld = require('jsonld');
var payswarm = {
  logger: require('./payswarm.loggers').get('app'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

var api = {};
module.exports = api;

/**
 * Gets a hash on the given JSON-LD object. In order to hash a JSON-LD
 * object, it is first reframed (if a frame is provided) and then
 * normalized.
 *
 * @param obj the JSON-LD object to hash.
 * @param [frame] the frame to use to reframe the object (optional).
 * @param callback(err, hash) called once the operation completes.
 */
api.hashJsonLd = function(obj, frame, callback) {
  // handle args
  if(typeof frame === 'function') {
    callback = frame;
    frame = null;
  }

  async.waterfall([
    function(callback) {
      // compact using payswarm context
      _compact(obj, callback);
    },
    function(obj, callback) {
      // do reframing if frame supplied
      if(frame) {
        return jsonld.frame(obj, frame, callback);
      }
      callback(null, obj);
    },
    function(obj, callback) {
      // normalize
      jsonld.normalize(obj, {format: 'application/nquads'}, callback);
    },
    function(normalized, callback) {
      // hash
      var md = crypto.createHash('sha1');
      md.update(normalized, 'utf8');
      callback(null, md.digest('hex'));
    }
  ], callback);
};

/**
 * Signs a JSON-LD object. The object will be updated to be in the default
 * context and its signature will be stored under "signature".
 *
 * @param obj the JSON-LD object to sign.
 * @param key the private key to sign with.
 * @param creator the URL to the paired public key.
 * @param [nonce] an optional nonce to include in the signature.
 * @param [date] an optional date to override the signature date with.
 * @param callback(err, obj) called once the operation completes.
 */
api.signJsonLd = function(obj, key, creator, nonce, date, callback) {
  if(typeof nonce === 'function') {
    callback = nonce;
    nonce = null;
    date = null;
  }
  if(typeof date === 'function') {
    callback = date;
    date = null;
  }

  // check key
  if(!('privateKeyPem' in key)) {
    return callback(new PaySwarmError(
      'PrivateKey missing "privateKeyPem" property.',
      'payswarm.security.InvalidPrivateKey'));
  }

  async.waterfall([
    function(callback) {
      // compact using payswarm context
      _compact(obj, callback);
    },
    function(obj, callback) {
      // get data to be signed
      _getSignatureData(obj, function(err, data) {
        callback(err, obj, data);
      });
    },
    function(obj, data, callback) {
      // get created date
      var created = payswarm.tools.w3cDate(date);

      try {
        // create signature
        var signer = crypto.createSign('RSA-SHA1');
        if(nonce !== undefined && nonce !== null) {
          signer.update(nonce);
        }
        signer.update(created);
        signer.update(data);
        var signature = signer.sign(key.privateKeyPem, 'base64');

        // set signature info
        var signInfo = {
          type: 'sec:GraphSignature2012',
          creator: creator,
          created: created,
          signatureValue: signature
        };
        if(nonce !== undefined && nonce !== null) {
          signInfo.nonce = nonce;
        }

        // attach new signature info
        // FIXME: support multiple signatures
        obj.signature = signInfo;

        // remove default context
        delete obj['@context'];
        callback(null, obj);
      }
      catch(e) {
        return callback(new PaySwarmError(
          'Could not sign JSON-LD.',
          'payswarm.security.SignError', null, e));
      }
    }
  ], callback);
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
  if(!('signature' in obj)) {
    return callback(new PaySwarmError(
      'Could not verify signature on object. Object is not signed.',
      'payswarm.security.InvalidSignature'));
  }

  if(!('publicKeyPem' in key)) {
    return callback(new PaySwarmError(
      'PublicKey missing "publicKeyPem" property.',
      'payswarm.security.InvalidPublicKey'));
  }

  try {
    // get data to be verified
    _getSignatureData(obj, function(err, data) {
      if(err) {
        throw err;
      }

      // verify signature
      var signInfo = obj.signature;
      var verifier = crypto.createVerify('RSA-SHA1');
      if('nonce' in signInfo) {
        verifier.update(signInfo.nonce);
      }
      verifier.update(signInfo.created);
      verifier.update(data);
      var verified = verifier.verify(
        key.publicKeyPem, signInfo.signatureValue, 'base64');
      callback(null, verified);
    });
  }
  catch(e) {
    return callback(new PaySwarmError(
      'Could not verify JSON-LD.',
      'payswarm.security.VerifyError', null, e));
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
  async.waterfall([
    function(callback) {
      // compact using a payswarm context if no context is present or the
      // context is not a string
      if(!('@context' in obj) || typeof obj['@context'] !== 'string') {
        return _compact(obj, callback);
      }
      callback(null, obj);
    },
    function(compacted, callback) {
      // generate key and IV
      crypto.randomBytes(32, function bytesReady(err, buf) {
        var key = buf.toString('binary', 0, 16);
        var iv = buf.toString('binary', 16);
        callback(null, compacted, key, iv);
      });
    },
    function(compacted, key, iv, callback) {
      try {
        // symmetric encrypt data
        var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        var encrypted = cipher.update(
          JSON.stringify(compacted), 'utf8', 'base64');
        encrypted += cipher.final('base64');

        // public key encrypt key and IV
        var keypair = rsa.createRsaKeypair({
          publicKey: publicKey.publicKeyPem
        });
        key = keypair.encrypt(key, 'binary', 'base64');
        iv = keypair.encrypt(iv, 'binary', 'base64');

        // create encrypted message
        var msg = {
          type: 'sec:EncryptedMessage',
          cipherData: encrypted,
          algorithm: 'rsa-aes-128-cbc',
          cipherKey: key,
          initializationVector: iv,
          publicKey: publicKey.id
        };

        callback(null, msg);
      }
      catch(e) {
        callback(new PaySwarmError(
          'Could not encrypt message.',
          'payswarm.security.EncryptMessageError', null, e));
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
  if(obj.cipherAlgorithm !== 'rsa-aes-128-cbc') {
    return callback(new PaySwarmError(
      'The JSON-LD encrypted message algorithm is not supported.',
      'payswarm.security.UnsupportedAlgorithm',
      {'algorithm': obj.cipherAlgorithm}));
  }

  // do message decryption
  async.waterfall([
    function decrypt(callback) {
      try {
        // private key decrypt key and IV
        var keypair = rsa.createRsaKeypair({
          privateKey: privateKey.privateKeyPem
        });
        var key = keypair.decrypt(
          obj.cipherKey, 'base64', 'binary');
        var iv = keypair.decrypt(
          obj.initializationVector, 'base64', 'binary');

        // symmetric decrypt data
        var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        var decrypted = decipher.update(obj.cipherData, 'base64', 'utf8');
        decrypted += decipher.final('base64');
        var msg = JSON.parse(decrypted);

        callback(null, msg);
      }
      catch(e) {
        callback(new PaySwarmError(
          'Could not encrypt message.',
          'payswarm.security.EncryptMessageError', null, e));
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
      md.update(value + salt, 'utf8');
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
 * @param hash the opaque hash value to verify against.
 * @param value the value to verify.
 * @param callback(err, verified) called once the operation completes.
 *
 * @return true if verified, false if not.
 */
api.verifySaltedHash = function(hash, value, callback) {
  var fields = hash.split(':');
  if(fields.length !== 3) {
    return callback(new PaySwarmError(
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
    md.update(value + fields[1], 'utf8');
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
      md.update(salt + serverKey + encoded, 'utf8');
      var hex = md.digest('hex');
      rval = (hex === checksum);
   }

   return rval;
}

/**
 * Gets the data used to generate or verify a signature.
 *
 * @param obj the object to get the data for.
 * @param callback(err, data) called once the operation completes.
 */
function _getSignatureData(obj, callback) {
  // compact using payswarm context
  _compact(obj, function(err, input) {
    // remove signature field
    delete input.signature;

    // normalize and serialize
    var options = {format: 'application/nquads'};
    jsonld.normalize(input, options, function(err, normalized) {
      if(err) {
        return callback(err);
      }
      callback(null, normalized);
    });
  });
}

/**
 * Compacts the given input using the default PaySwarm context.
 *
 * @param input the input.
 * @param callback(err, output) called once the operation completes.
 *
 * @return the output.
 */
function _compact(input, callback) {
  var ctx = payswarm.tools.clone(payswarm.tools.getDefaultJsonLdContext());

   // add context to input before compaction if not already provided
   // or if it is a string, (HACK: assume string context is the default
   // payswarm context URL)
   if(!('@context' in input) || typeof input['@context'] === 'string') {
     input = payswarm.tools.clone(input);
     input['@context'] = ctx;
     jsonld.compact(input, ctx, function(err, compact) {
       callback(err, compact);
     });
   }
   // do simple compaction (the context may be the payswarm context or some
   // other one, in the former case compaction may help reduce the number of
   // terms listed in the context and in the latter we convert to payswarm)
   else {
     jsonld.compact(input, ctx, function(err, compact) {
       callback(err, compact);
     });
   }
}
