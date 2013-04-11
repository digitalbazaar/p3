/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var ursa = require('ursa');
var util = require('util');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  logger: require('./loggers').get('app'),
  tools: require('./tools')
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
      // if context is not present, it is safe to assume it uses
      // the default payswarm context
      if(!('@context' in obj)) {
        obj = payswarm.tools.clone(obj);
        obj['@context'] = payswarm.tools.PAYSWARM_CONTEXT;
        return callback(null, obj);
      }
      callback(null, obj);
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
      var md = crypto.createHash('sha256');
      md.update(normalized, 'utf8');
      callback(null, 'urn:sha256:' + md.digest('hex'));
    }
  ], callback);
};

/**
 * Signs a JSON-LD object that is assumed to be compacted using the default
 * payswarm context. The signature will be stored under "signature" in the
 * output.
 *
 * @param obj the JSON-LD object to sign.
 * @param key the private key to sign with.
 * @param creator the URL to the paired public key.
 * @param [nonce] an optional nonce to include in the signature.
 * @param [date] an optional date to override the signature date with.
 * @param callback(err, output) called once the operation completes.
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

  // clone object
  var output = payswarm.tools.clone(obj);

  async.waterfall([
    function(callback) {
      // get data to be signed
      _getSignatureData(output, callback);
    },
    function(data, callback) {
      // get created date
      var created = payswarm.tools.w3cDate(date);

      try {
        // create signature
        var signer = crypto.createSign('RSA-SHA256');
        if(nonce !== undefined && nonce !== null) {
          signer.update(nonce);
        }
        signer.update(created);
        signer.update(data);
        var signature = signer.sign(key.privateKeyPem, 'base64');

        // set signature info
        var signInfo = {
          type: 'GraphSignature2012',
          creator: creator,
          created: created,
          signatureValue: signature
        };
        if(nonce !== undefined && nonce !== null) {
          signInfo.nonce = nonce;
        }

        // attach new signature info
        // FIXME: support multiple signatures
        output.signature = signInfo;
        callback(null, output);
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

  if('revoked' in key) {
    return callback(new PaySwarmError(
      'The public key has been revoked.',
      'payswarm.security.RevokedPublicKey', {'public': true}));
  }

  if(!('publicKeyPem' in key)) {
    return callback(new PaySwarmError(
      'The public key is missing the "publicKeyPem" property.',
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
      var verifier = crypto.createVerify('RSA-SHA256');
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
 * symmetric key encryption. This method assumes the object has been
 * appropriate compacted using the payswarm context.
 *
 * @param obj the JSON-LD object to encrypt.
 * @param publicKey the public key to encrypt with.
 * @param callback(err, msg) called once the operation completes.
 */
api.encryptJsonLd = function(obj, publicKey, callback) {
  async.waterfall([
    function(callback) {
      // generate key and IV
      crypto.randomBytes(32, function bytesReady(err, buf) {
        var key = buf.toString('binary', 0, 16);
        var iv = buf.toString('binary', 16);
        callback(null, key, iv);
      });
    },
    function(key, iv, callback) {
      try {
        // use @context url, symmetric encrypt data
        var oldCtx = obj['@context'] || null;
        obj['@context'] = payswarm.tools.getDefaultJsonLdContextUrl();
        var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        var encrypted = cipher.update(JSON.stringify(obj), 'utf8', 'base64');
        encrypted += cipher.final('base64');
        if(oldCtx !== null) {
          obj['@context'] = oldCtx;
        }

        // public key encrypt key and IV
        var pk = ursa.createPublicKey(publicKey.publicKeyPem, 'utf8');
        key = pk.encrypt(key, 'binary', 'base64', ursa.RSA_PKCS1_OAEP_PADDING);
        iv = pk.encrypt(iv, 'binary', 'base64', ursa.RSA_PKCS1_OAEP_PADDING);

        // create encrypted message
        var msg = {
          '@context': payswarm.tools.getDefaultJsonLdContextUrl(),
          type: 'EncryptedMessage',
          cipherData: encrypted,
          cipherAlgorithm: 'rsa-sha256-aes-128-cbc',
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
  if(obj.cipherAlgorithm !== 'rsa-sha256-aes-128-cbc') {
    return callback(new PaySwarmError(
      'The JSON-LD encrypted message algorithm is not supported.',
      'payswarm.security.UnsupportedAlgorithm',
      {'algorithm': obj.cipherAlgorithm}));
  }

  // do message decryption
  try {
    // private key decrypt key and IV
    var pk = ursa.createPrivateKey(privateKey.privateKeyPem, 'utf8');
    var key = pk.decrypt(
      obj.cipherKey, 'base64', 'binary',
      ursa.RSA_PKCS1_OAEP_PADDING);
    var iv = pk.decrypt(
      obj.initializationVector, 'base64', 'binary',
      ursa.RSA_PKCS1_OAEP_PADDING);

    // symmetric decrypt data
    var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    var decrypted = decipher.update(obj.cipherData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    var msg = JSON.parse(decrypted);

    callback(null, msg);
  }
  catch(e) {
    callback(new PaySwarmError(
      'Could not encrypt message.',
      'payswarm.security.EncryptMessageError', null, e));
  }
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
 * Creates a password hash that can be stored and later used to verify a
 * password at a later point in time.
 *
 * @param password the password to hash.
 * @param callback(err, hash) called once the operation completes.
 */
api.createPasswordHash = function(password, callback) {
  bcrypt.genSalt(function(err, salt) {
    bcrypt.hash(password, salt, function(err, hash) {
      callback(err, 'bcrypt:' + hash);
    });
  });
};

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
    return callback(new PaySwarmError(
      'Could not verify password hash. Invalid input.',
      'payswarm.security.MalformedPasswordHash'));
  }

  // legacy bitmunk hash
  if(fields[0] === 'md5-1') {
    var verified = _verifyLegacyPassword(password, fields[1], fields[2]);
    callback(null, verified, true);
  }
  // legacy salted hash
  else if(fields.length === 3) {
    // hash value+salt
    var md = crypto.createHash(fields[0]);
    md.update(password + fields[1], 'utf8');
    var hex = md.digest('hex');
    var verified = (hex === fields[2]);
    callback(null, verified, true);
  }
  // bcrypt hash
  else if(fields[0] === 'bcrypt') {
    bcrypt.compare(password, fields[1], function(err, verified) {
      callback(err, verified, false);
    });
  }
  // unknown algorithm
  else {
    return callback(new PaySwarmError(
      'Could not verify password hash. Invalid input.',
      'payswarm.security.MalformedPasswordHash'));
  }
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
 * Gets the data used to generate or verify a signature. It is assumed that
 * the given object is compacted using the default JSON-LD context.
 *
 * @param obj the object to get the data for.
 * @param callback(err, data) called once the operation completes.
 */
function _getSignatureData(obj, callback) {
  // safe to assume default payswarm context
  var oldCtx = obj['@context'] || null;
  obj['@context'] = payswarm.tools.getDefaultJsonLdContextUrl();
  var oldSignature = obj.signature || null;
  delete obj.signature;

  // normalize and serialize
  var options = {format: 'application/nquads'};
  jsonld.normalize(obj, options, function(err, normalized) {
    if(oldCtx !== null) {
      obj['@context'] = oldCtx;
    }
    if(oldSignature !== null) {
      obj.signature = oldSignature;
    }
    callback(err, normalized);
  });
}
