/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  db: bedrock.modules['bedrock.database'],
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  security: require('./security'),
  tools: require('./tools')
};
var BedrockError = payswarm.tools.BedrockError;

// constants
var MODULE_NS = 'payswarm.authority';

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// module API
var api = {};
api.name = MODULE_NS;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  callback();
};

/**
 * Retrieves a PaySwarm Authority key-pair for signing/encryption. One
 * key-pair from Authority's key-pairs will be selected.
 *
 * @param actor the Identity performing the action.
 * @param callback(err, publicKey, privateKey) called once the operation
 *          completes.
 */
api.getAuthorityKeyPair = function(actor, callback) {
  var authorityId = payswarm.config.authority.id;
  async.waterfall([
    function(callback) {
      payswarm.identity.checkPermission(
        actor, PERMISSIONS.IDENTITY_ACCESS, {resource: authorityId}, callback);
    },
    function(callback) {
      payswarm.db.collections.publicKey.findOne(
        {owner: payswarm.db.hash(authorityId), 'publicKey.sysStatus': 'active'},
        {publicKey: true}, callback);
    },
    function(record, callback) {
      // no such public key
      if(record === null) {
        return callback(null, null, null);
      }
      var privateKey = record.publicKey.privateKey || null;
      delete record.publicKey.privateKey;
      return callback(null, record.publicKey, privateKey);
    }
  ], callback);
};

/**
 * Signs and encrypts a message for the given Identity. The given object
 * will be signed using a PaySwarm Authority key.
 *
 * @param obj the object to encrypt.
 * @param encryptKeyId the ID of the PublicKey to encrypt with.
 * @param nonce an optional nonce to use when signing (can be null).
 * @param callback(err, encrypted) called once the operation completes.
 */
// FIXME: change to use named params via "options"
api.encryptMessage = function(obj, encryptKeyId, nonce, callback) {
  if(typeof nonce === 'function') {
    callback = nonce;
    nonce = null;
  }
  async.auto({
    getEncryptKey: function(callback) {
      // get identity public key to encrypt with
      payswarm.identity.getIdentityPublicKey(
        {id: encryptKeyId}, function(err, key) {
        callback(err, key);
      });
    },
    getAuthorityKeys: function(callback) {
      // get authority keys without permission check
      api.getAuthorityKeyPair(null, function(err, publicKey, privateKey) {
        callback(err, {publicKey: publicKey, privateKey: privateKey});
      });
    },
    sign: ['getAuthorityKeys', function(callback, results) {
      var publicKey = results.getAuthorityKeys.publicKey;
      var privateKey = results.getAuthorityKeys.privateKey;
      payswarm.security.signJsonLd(obj, {
        key: privateKey,
        creator: publicKey.id,
        nonce: nonce
      }, callback);
    }],
    encrypt: ['getEncryptKey', 'sign', function(callback, results) {
      var encryptKey = results.getEncryptKey;
      var signed = results.sign;
      payswarm.security.encryptJsonLd(signed, encryptKey, callback);
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    callback(null, results.encrypt);
  });
};

/**
 * Decrypts and a message for the given Identity.
 *
 * @param actor the actor performing the action.
 * @param msg the encrypted message to decrypt.
 * @param [decryptKey] optional decryption private key, if not provided,
 *          it will be looked up using its public key pair ID.
 * @param callback(err, decrypted, decryptKey) called once the operation
 *          completes.
 */
// FIXME: change to use named params via "options"
api.decryptMessage = function(actor, msg, decryptKey, callback) {
  if(typeof decryptKey === 'function') {
    callback = decryptKey;
    decryptKey = null;
  }

  if(!jsonld.hasValue(msg, 'type', 'EncryptedMessage') ||
    !jsonld.hasValue(msg, 'type', 'publicKey')) {
    return callback(new BedrockError(
      'Encrypted message is malformed or missing the "publicKey" property.',
      'payswarm.security.InvalidEncryptedMessage',
      {'public': true, httpStatusCode: 400}));
  }

  async.auto({
    getDecryptKey: function(callback) {
      if(decryptKey) {
        return callback(null, decryptKey);
      }
      // get private key associated with the public key the message was
      // encrypted with
      payswarm.identity.getIdentityPublicKey({id: msg.publicKey}, actor,
        function(err, publicKey, meta, privateKey) {
          if(err) {
            return callback(err);
          }
          if(!privateKey) {
            return callback(new BedrockError(
              'The private key for the given public key is not available.',
              'payswarm.security.PrivateKeyNotFound',
              {'public': true, httpStatusCode: 400}));
          }
          callback(null, privateKey);
      });
    },
    decrypt: ['getDecryptKey', function(callback, results) {
      var decryptKey = results.getDecryptKey;
      payswarm.security.decryptJsonLd(msg, decryptKey, callback);
    }]
  }, function(err, results) {
    if(err) {
      return callback(new BedrockError(
        'Could not decrypt the encrypted message.',
        'payswarm.security.DecryptionError',
        {'public': true}, err));
    }
    callback(null, results.decrypt, results.getDecryptKey);
  });
};
