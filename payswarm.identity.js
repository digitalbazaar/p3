/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var rsa = require('rsa');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  tools: require('./payswarm.tools'),
  addressValidator: require('./payswarm.addressValidator')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.identity';
var MODULE_IRI = 'https://payswarm.com/modules/identity';

// module permissions
var PERMISSIONS = {
  IDENTITY_ADMIN: MODULE_IRI + '#identity_admin',
  IDENTITY_ACCESS: MODULE_IRI + '#identity_access',
  IDENTITY_CREATE: MODULE_IRI + '#identity_create',
  IDENTITY_EDIT: MODULE_IRI + '#identity_edit',
  IDENTITY_REMOVE: MODULE_IRI + '#identity_remove',
  PUBLIC_KEY_CREATE: MODULE_IRI + '#public_key_create',
  PUBLIC_KEY_REMOVE: MODULE_IRI + '#public_key_remove'
};

// module API
var api = {};
api.name = MODULE_TYPE + '.Identity';
module.exports = payswarm.tools.extend(
  api,
  // sub modules
  payswarm.addressValidator
);

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    payswarm.addressValidator.init,
    function(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['identity', 'publicKey'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'identity',
        fields: {id: true},
        options: {unique: true, background: true}
      }, {
        collection: 'identity',
        fields: {owner: true},
        options: {unique: false, background: true}
      }, {
        collection: 'publicKey',
        fields: {id: true},
        options: {unique: true, background: true}
      }, {
        collection: 'publicKey',
        fields: {owner: true, pem: true},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      // create identities, ignoring duplicate errors
      async.forEachSeries(
        payswarm.config.identity.identities,
        function(i, callback) {
          _createIdentity(i, function(err) {
            if(err && payswarm.db.isDuplicateError(err)) {
              err = null;
            }
            callback(err);
          });
        },
        callback);
    },
    function(callback) {
      // add keys, ignoring duplicate errors
      async.forEachSeries(
        payswarm.config.identity.keys,
        function(i, callback) {
          var publicKey = i.publicKey;
          var privateKey = i.privateKey || null;
          _addIdentityPublicKey(publicKey, privateKey, function(err) {
            if(err && payswarm.db.isDuplicateError(err)) {
              err = null;
            }
            callback(err);
          });
        }, callback);
    }
  ], callback);
};

/**
 * Creates an Identity ID from the given name.
 *
 * @param name the short identity name (slug).
 *
 * @return the Identity ID for the Identity.
 */
api.createIdentityId = function(name) {
  return util.format('%s/i/%s',
    payswarm.config.authority.baseUri,
    encodeURIComponent(name));
};

/**
 * Gets the default Identity ID from the given Profile.
 *
 * (deprecated)
 *
 * @param profile the Profile to get the default Identity ID for.
 * @param callback(err, identityId) called once the operation completes.
 */
api.getProfileDefaultIdentityId = function(profile, callback) {
  async.waterfall([
    function(callback) {
      if('psa:slug' in profile) {
        callback(null, profile);
      }
      // get profile
      else {
        payswarm.profile.getProfile(
          profile, profile['@id'], function(err, profile) {
            callback(err, profile);
          });
      }
    },
    function(profile, callback) {
      // get default identity
      getProfileDefaultIdentity(profile, profile, function(err, identity) {
        callback(err, identity);
      });
    },
    function(identity, callback) {
      callback(null, identity['@id']);
    }
  ], callback);
};

/**
 * Creates a new Identity.
 *
 * The Identity must contain @id and an owner.
 *
 * @param actor the Profile performing the action.
 * @param identity the Identity containing at least the minimum required data.
 * @param callback(err) called once the operation completes.
 */
api.createIdentity = function(actor, identity, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, identity,
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_CREATE,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      _createIdentity(identity, callback);
    }
  ], callback);
};

/**
 * Gets the default Identity for the given Profile.
 *
 * @param actor the Profile performing the action.
 * @param profileId the ID of the Profile to get the default Identity ID for.
 * @param callback(err, identity, meta) called once the operation completes.
 */
api.getProfileDefaultIdentity = function(actor, profileId, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': profileId},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.findOne(
        {owner: payswarm.db.hash(profileId)},
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      callback(null, result.identity, result.meta);
    }
  ], callback);
};

/**
 * Retrieves all Identities owned by a profile.
 *
 * @param actor the Profile performing the action.
 * @param profileId the ID of the profile.
 * @param callback(err, records) called once the operation completes.
 */
api.getProfileIdentities = function(actor, profileId, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': profileId},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.find(
        {owner: payswarm.db.hash(profileId)},
        payswarm.db.readOptions).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves all Identities matching the given query.
 *
 * @param actor the Profile performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param callback(err, records) called once the operation completes.
 */
api.getIdentities = function(actor, query, fields, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  }
  else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  }

  query = query || {};
  fields = fields || {};
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.IDENTITY_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.find(
        query, fields, payswarm.db.readOptions).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves an Identity.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Identity to retrieve.
 * @param callback(err, identity, meta) called once the operation completes.
 */
api.getIdentity = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.identity.findOne(
        {id: payswarm.db.hash(id)},
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Identity not found.',
          MODULE_TYPE + '.IdentityNotFound',
          {'@id': id}));
      }
      callback(null, result.identity, result.meta);
    },
    function(identity, meta, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, identity,
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS,
        api.checkIdentityOwner, function(err) {
          callback(err, identity, meta);
        });
    },
  ], callback);
};

/**
 * Updates an Identity. Only specific information contained in the passed
 * Identity will be updated. Restricted fields can not be updated in this
 * call, and may have their own API calls.
 *
 * @param actor the Profile performing the action.
 * @param identity the Identity to update.
 * @param callback(err) called once the operation completes.
 */
api.updateIdentity = function(actor, identity, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, identity,
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_EDIT,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      // remove restricted fields
      identity = payswarm.tools.clone(identity);
      delete identity['psa:slug'];
      delete identity['psa:status'];
      delete identity['ps:owner'];
      delete identity['ps:preferences'];
      delete identity['vcard:adr'];
      payswarm.db.collections.identity.update(
        {id: payswarm.db.hash(identity['@id'])},
        {$set: payswarm.db.buildUpdate(identity)},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not update Identity. Identity not found.',
          MODULE_TYPE + '.IdentityNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
};

/**
 * Adds an Address to an Identity.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Identity to update.
 * @param address the Address to add to the Identity.
 * @param callback(err) called once the operations completes.
 */
api.addIdentityAddress = function(actor, id, address, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': id},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_EDIT,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.update(
        {id: payswarm.db.hash(id)},
        {$push: {'identity.vcard:adr': address}},
        payswarm.db.writeOptions, callback);
    },
    function(n, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not add address to Identity. Identity not found.',
          MODULE_TYPE + '.IdentityNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
};

/**
 * Retrieves an Identity's Addresses.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Identity to retrieve the addresses for.
 * @param callback(err, addresses) called once the operation completes.
 */
api.getIdentityAddresses = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': id},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.find(
        {id: payswarm.db.hash(id)},
        ['identity.vcard:adr'],
        payswarm.db.readOptions).toArray(callback);
    },
    function(results, callback) {
      callback(null, results);
    }
  ], callback);
};

/**
 * Sets an identity's preferences.
 *
 * @param actor the Profile performing the action.
 * @param prefs the Identity's preferences, with "ps:owner" set to the
 *          Identity.
 * @param callback(err) called once the operation completes.
 */
api.setIdentityPreferences = function(actor, prefs, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': prefs['ps:owner']},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_EDIT,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.update(
        {id: payswarm.db.hash(prefs['ps:owner'])},
        {$set: {'identity.ps:preferences': prefs}},
        payswarm.db.writeOptions, callback);
    },
    function(n, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not update Identity preferences. Identity not found.',
          MODULE_TYPE + '.IdentityNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
};

/**
 * Gets an identity's preferences.
 *
 * @param actor the Profile performing the action.
 * @param prefs the Identity's preferences to populate, with "ps:owner" set
 *          to the Identity.
 * @param callback(err, prefs) called once the operation completes.
 */
api.getIdentityPreferences = function(actor, prefs, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': prefs['ps:owner']},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.identity.findOne(
        {id: payswarm.db.hash(prefs['ps:owner'])},
        {'identity.ps:preferences': true},
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(result) {
        result = result.identity['ps:preferences'];
      }
      callback(null, result);
    }
  ], callback);
};

/**
 * Creates a PublicKeyId from the given IdentityId and key name.
 *
 * @param ownerId the identity ID of the owner of the key.
 * @param keyName the name of the key.
 *
 * @return the PublicKey ID created from the ownerId and keyName.
 */
api.createIdentityPublicKeyId = function(ownerId, keyName) {
  return util.format('%s/keys/%s', ownerId, encodeURIComponent(name));
};

/**
 * Adds a new PublicKey to the Identity.
 *
 * @param actor the Profile performing the action.
 * @param publicKey the publicKey to add, with no ID yet set.
 * @param privateKey the privateKey that is paired with the publicKey,
 *          only provided if this is an encryption key for an authority.
 * @param callback(err) called once the operation completes.
 */
api.addIdentityPublicKey = function(actor, publicKey) {
  var privateKey = null;
  var callback;
  if(arguments.length === 3) {
    callback = arguments[2];
  }
  else {
    privateKey = arguments[2];
    callback = arguments[3];
  }

  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': publicKey['ps:owner']},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.PUBLIC_KEY_CREATE,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      _addIdentityPublicKey(publicKey, privateKey, callback);
    }
  ], callback);
};

/**
 * Retrieves an Identity's PublicKey.
 *
 * @param publicKey the PublicKey with '@id' or 'sec:publicKeyPem' set.
 * @param actor the Profile performing the action (only provide to get
 *          the private key also).
 * @param callback(err, publicKey, meta, privateKey) called once the
 *          operation completes.
 */
api.getIdentityPublicKey = function(publicKey) {
  var actor = null;
  var callback;
  if(arguments.length === 2) {
    callback = arguments[1];
  }
  else {
    actor = arguments[1];
    callback = arguments[2];
  }

  async.waterfall([
    function(callback) {
      var query = {};
      if('@id' in publicKey) {
        query.id = payswarm.db.hash(publicKey['@id']);
      }
      else {
        query.pem = payswarm.db.hash(publicKey['sec:publicKeyPem']);
      }
      payswarm.db.collections.publicKey.findOne(
        query, payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      // no such public key
      if(result === null) {
        return callback(null, null, null, null);
      }
      var privateKey = result.publicKey['psa:privateKey'] || null;
      delete result.publicKey['psa:privateKey'];
      return callback(null, result.publicKey, result.meta, privateKey);
    },
    function(publicKey, meta, privateKey, callback) {
      if(!actor) {
        callback(null, publicKey, meta, privateKey);
      }
      else {
        payswarm.profile.checkActorPermissionForObject(
          actor, {'@id': publicKey['ps:owner']},
          PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS,
          api.checkIdentityOwner, function(err) {
            if(err) {
              return callback(err);
            }
            else {
              callback(null, publicKey, meta, privateKey);
            }
          });
      }
    }
  ], callback);
};

/**
 * Retrieves an Identity's PublicKey(s).
 *
 * @param id the ID of the identity to get the PublicKeys for.
 * @param actor the Profile performing the action (only provide to get
 *          the private key also).
 * @param callback(err, records) called once the operation completes.
 */
api.getIdentityPublicKeys = function(id) {
  var actor = null;
  var callback;
  if(arguments.length === 2) {
    callback = arguments[1];
  }
  else {
    actor = arguments[1];
    callback = arguments[2];
  }

  async.waterfall([
    function(callback) {
      payswarm.db.collections.publicKey.find(
        {owner: payswarm.db.hash(id)},
        payswarm.db.readOptions).toArray(callback);
    },
    function(results, callback) {
      if(actor) {
        payswarm.profile.checkActorPermissionForObject(
          actor, {'@id': id},
          PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS,
          api.checkIdentityOwner, function(err) {
            if(err) {
              return callback(err);
            }
            else {
              callback(null, results);
            }
          });
      }
      else {
        callback(null, results);
      }
    },
    function(results, callback) {
      // remove private keys if no actor was provided
      if(!actor) {
        results.forEach(function(publicKey) {
          delete publicKey['psa:privateKey'];
        });
      }
      callback(null, results);
    }
  ], callback);
};

/**
 * Updates descriptive data for a PublicKey.
 *
 * @param actor the Profile performing the action.
 * @param publicKey the publicKey to update.
 * @param callback(err) called once the operation completes.
 */
api.updateIdentityPublicKey = function(actor, publicKey, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': publicKey['ps:owner']},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_EDIT,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      // remove restricted fields
      publicKey = payswarm.tools.clone(publicKey);
      delete publicKey['sec:publicKeyPem'];
      delete publicKey['ps:owner'];
      payswarm.db.collections.publicKey.update(
        {id: payswarm.db.hash(publicKey['@id'])},
        {$set: payswarm.db.buildUpdate(publicKey)},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not update public key. Public key not found.',
          MODULE_TYPE + '.PublicKeyNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
};

/**
 * Retrieves a PaySwarm Authority key-pair for signing/encryption. One
 * key-pair from Authority's key-pairs will be selected.
 *
 * @param actor the Profile performing the action.
 * @param callback(err, publicKey, privateKey) called once the operation
 *          completes.
 */
api.getAuthorityKeyPair = function(actor, callback) {
  var authorityId = payswarm.config.authority.id;
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {'@id': authorityId},
        PERMISSIONS.IDENTITY_ADMIN, PERMISSIONS.IDENTITY_ACCESS,
        api.checkIdentityOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.publicKey.findOne(
        {owner: payswarm.db.hash(authorityId)},
        {publicKey: true}, payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      // no such public key
      if(result === null) {
        return callback(null, null, null);
      }
      var privateKey = result.publicKey['psa:privateKey'] || null;
      delete result.publicKey['psa:privateKey'];
      return callback(null, result.publicKey, privateKey);
    }
  ], callback);
};

/**
 * Checks if an actor owns an identity.
 *
 * @param actor the actor to compare against.
 * @param identity the identity to compare.
 * @param callback(err, owns) called once the operation completes.
 */
api.checkIdentityOwner = function(actor, identity, callback) {
  async.waterfall([
    function(callback) {
      if('ps:owner' in identity) {
        return callback(null, identity);
      }
      api.getIdentity(actor, identity['@id'], function(err, identity) {
        callback(err, identity);
      });
    },
    function(identity, callback) {
      callback(null, actor['@id'] === identity['ps:owner']);
    }
  ], callback);
};

/**
 * Checks if an actor owns an identity that owns another object.
 *
 * @param actor the actor to compare against.
 * @param object the object to compare.
 * @param callback(err, owns) called once the operation completes.
 */
api.checkIdentityObjectOwner = function(actor, object, callback) {
  api.checkIdentityOwner(actor, {'@id': object['ps:owner']}, callback);
};

/**
 * Creates a new identity, inserting it into the database.
 *
 * @param identity the identity to create.
 * @param callback(err, record) called once the operation completes.
 */
function _createIdentity(identity, callback) {
  payswarm.logger.info('creating identity', identity);

  var defaults = payswarm.config.identity.defaults;

  // add identity defaults
  identity = payswarm.tools.extend(
    true, {}, defaults.identity, identity);

  // insert the identity
  var now = +new Date();
  var record = {
    id: payswarm.db.hash(identity['@id']),
    owner: payswarm.db.hash(identity['ps:owner']),
    meta: {
      created: now,
      updated: now
    },
    identity: identity
  };
  payswarm.db.collections.identity.insert(
    record, payswarm.db.writeOptions, callback);
}

/**
 * Adds a public key to an identity, inserting it into the database.
 *
 * @param publicKey the PublicKey to insert.
 * @param privateKey optional private key.
 * @param callback(err) called once the operation completes.
 */
function _addIdentityPublicKey(publicKey) {
  payswarm.logger.debug('adding public key', publicKey);

  var privateKey = null;
  var callback;
  if(arguments.length === 2) {
    callback = arguments[1];
  }
  else {
    privateKey = arguments[1];
    callback = arguments[2];
  }

  async.waterfall([
    function(callback) {
      // load and verify keypair
      var keypair = rsa.createRsaKeypair({
        publicKey: publicKey['sec:publicKeyPem'],
        privateKey: privateKey ? privateKey['sec:privateKeyPem'] : null
      });
      if(keypair.publicKey === null) {
        return callback(new PaySwarmError(
          'Could not add public key to Identity. Invalid public key.',
          MODULE_TYPE + '.InvalidPublicKey'));
      }
      if(privateKey && keypair.privateKey === null) {
        return callback(new PaySwarmError(
          'Could not add private key to Identity. Invalid private key.',
          MODULE_TYPE + '.InvalidPrivateKey'));
      }
      if(privateKey) {
        var ciphertext = keypair.encrypt('plaintext', 'utf8');
        var plaintext = keypair.decrypt(ciphertext, 'binary', 'utf8');
        if(plaintext !== 'plaintext') {
          return callback(new PaySwarmError(
            'Could not add public key to Identity. Key pair does not match.',
            MODULE_TYPE + '.InvalidKeyPair'));
        }
      }
      callback();
    },
    function(callback) {
      // FIXME: do we check to ensure someone can't claim someone else's
      // public keys as their own?

      // @id provided, skip public key ID generation
      if('@id' in publicKey) {
        return callback(null, null);
      }

      // get next public key ID from identity meta
      // FIXME: ensure query contains shard key for findAndModify
      payswarm.db.collections.identity.findAndModify(
        {id: payswarm.db.hash(publicKey['ps:owner'])},
        [['id', 'asc']],
        {$inc: {'meta.lastPublicKeyId': 1}},
        payswarm.tools.extend(
          {}, payswarm.db.writeOptions,
          {upsert: true, 'new': true, fields: {'meta.lastPublicKeyId': true}}),
        callback);
    },
    function(result, callback) {
      // FIXME: disallow setting public key names for anyone but
      // the authority ... instead search all public keys for a
      // particular identity and reject dups

      // FIXME: code assumes keys will be added in proper order...
      // won't work if people edit config to insert new keys after
      // others have been generated by the code

      // set default status
      if(!('psa:status' in publicKey)) {
        publicKey['psa:status'] = 'active';
      }

      // if no ID was provided, get last public key ID and update it
      if(!('@id' in publicKey)) {
        publicKey['@id'] = api.createIdentityPublicKeyId(
          publicKey['ps:owner'], result.meta.lastPublicKeyId);

        // if no label was provided, add default label
        if(!('rdfs:label' in publicKey)) {
          publicKey['rdfs:label'] = util.format(
            'Key %d', result.meta.lastPublicKeyId);
        }
      }

      // add private key if given
      if(privateKey) {
        publicKey = payswarm.tools.clone(publicKey);
        publicKey['psa:privateKey'] = privateKey;
      }

      // insert the publc key
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(publicKey['@id']),
        owner: payswarm.db.hash(publicKey['ps:owner']),
        pem: payswarm.db.hash(publicKey['sec:publicKeyPem']),
        meta: {
          created: now,
          updated: now
        },
        publicKey: publicKey
      };
      payswarm.db.collections.publicKey.insert(
        record, payswarm.db.writeOptions, callback);
    }
  ], callback);
}

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    '@id': PERMISSIONS.IDENTITY_ADMIN,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Identity Administration',
    'rdfs:comment': 'Required to administer Identities.'
  }, {
    '@id': PERMISSIONS.IDENTITY_ACCESS,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Access Identity',
    'rdfs:comment': 'Required to access an Identity.'
  }, {
    '@id': PERMISSIONS.IDENTITY_CREATE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Create Identity',
    'rdfs:comment': 'Required to create an Identity.'
  }, {
    '@id': PERMISSIONS.IDENTITY_EDIT,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Edit Identity',
    'rdfs:comment': 'Required to edit an Identity.'
  }, {
    '@id': PERMISSIONS.IDENTITY_REMOVE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Remove Identity',
    'rdfs:comment': 'Required to remove an Identity.'
  }, {
    '@id': PERMISSIONS.PUBLIC_KEY_CREATE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Create Public Key',
    'rdfs:comment': 'Required to create a Public Key.'
  }, {
    '@id': PERMISSIONS.PUBLIC_KEY_REMOVE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Remove Public Key',
    'rdfs:comment': 'Required to remove a Public Key.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
