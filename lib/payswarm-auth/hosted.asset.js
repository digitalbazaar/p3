/*
 * Copyright (c) 2013-2014 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var PATH = require('path');
var payswarm = {
  authority: require('./authority'),
  security: require('./security'),
  tools: require('./tools')
};
//var ursa = require('ursa');
var URL = require('url');
var util = require('util');
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

// constants
var MODULE_NS = 'payswarm.hosted.asset';

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// TODO: for server-side RSA keygen, if ever necessary
//var KEY_SIZE = 2048;
//var KEY_RSA_E = 0x10001;

// module API
var api = {};
api.name = MODULE_NS;
module.exports = api;

// distributed ID generator
var assetIdGenerator = null;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      // open all necessary collections
      brDatabase.openCollections(
        ['hostedAsset', 'hostedAssetPublicKey'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      brDatabase.createIndexes([{
        collection: 'hostedAsset',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'hostedAsset',
        fields: {assetProvider: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'hostedAsset',
        fields: {assetProvider: 1, assetContent: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'hostedAsset',
        fields: {assetProvider: 1, keywords: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        // see getAssetContentPublicKeyId for ID scheme
        collection: 'hostedAssetPublicKey',
        fields: {id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    function(callback) {
      brDatabase.getDistributedIdGenerator('hostedAsset',
        function(err, idGenerator) {
          if(!err) {
            assetIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
});

/**
 * Creates a hosted Asset ID from the given Identity ID and Asset slug.
 *
 * @param providerId the Identity ID.
 * @param name the short Asset name (slug).
 *
 * @return the hosted Asset ID.
 */
api.createAssetId = function(providerId, name) {
  return util.format('%s/assets/%s', providerId, encodeURIComponent(name));
};

/**
 * Creates a new hosted Asset ID based on the asset provider's Identity ID.
 *
 * @param providerId the ID of the Identity that provides the Asset.
 * @param callback(err, id) called once the operation completes.
 */
api.generateAssetId = function(providerId, callback) {
  assetIdGenerator.generateId(function(err, id) {
    if(err) {
      return callback(err);
    }
    callback(null, api.createAssetId(providerId, id));
  });
};

/**
 * Creates a new hosted Asset. The "id" (and all other Asset fields) must be
 * set.
 *
 * @param actor the Identity performing the action.
 * @param asset the new Asset to create.
 * @param callback(err, record) called once the operation completes.
 */
api.createAsset = function(actor, asset, callback) {
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.ASSET_CREATE,
        {resource: asset, translate: 'assetProvider'}, callback);
    },
    function(callback) {
      // hash asset
      payswarm.security.hashJsonLd(asset, function(err, hash) {
        asset.sysAssetHash = hash;
        callback(err);
      });
    },
    function(callback) {
      logger.debug('creating asset', asset);

      // FIXME: ensure actor is authorized to set assetProvider indicated in
      // the Asset

      // insert asset
      var now = +new Date();
      var record = {
        id: brDatabase.hash(asset.id),
        created: new Date(asset.created),
        assetProvider: brDatabase.hash(asset.assetProvider),
        assetContent: brDatabase.hash(asset.assetContent),
        keywords: payswarm.tools.getAssetKeywords(asset),
        meta: {
          created: now,
          updated: now
        },
        asset: asset
      };
      // allows querying on published date
      if(asset.sysPublished) {
        record.published = new Date(asset.sysPublished);
      }
      brDatabase.collections.hostedAsset.insert(
        record, brDatabase.writeOptions, function(err, result) {
          if(err) {
            return callback(err);
          }
          callback(null, result.ops[0]);
        });
    }
  ], callback);
};

/**
 * Gets the hosted Asset by ID.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Asset to retrieve.
 * @param callback(err, asset, meta) called once the operation completes.
 */
api.getAsset = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      brDatabase.collections.hostedAsset.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new BedrockError(
          'Asset not found.',
          MODULE_NS + '.AssetNotFound',
          {id: id, 'public': true, httpStatusCode: 404}));
      }
      callback(null, record);
    },
    function(record, callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.ASSET_ACCESS,
        {resource: record.asset, translate: 'assetProvider'}, function(err) {
          callback(err, record);
        });
    },
    function(record, callback) {
      // update asset
      _updateAsset(record, function(err, record) {
        return callback(err, record.asset, record.meta);
      });
    }
  ], callback);
};

/**
 * Gets hosted Assets based on the given query.
 *
 * @param actor the Identity performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 *
 * @return true on success, false on failure with exception set.
 */
api.getAssets = function(actor, query, fields, options, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  } else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  } else if(typeof options === 'function') {
    callback = options;
    options = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  async.waterfall([
    function(callback) {
      brDatabase.collections.hostedAsset.find(
        query, fields, options).toArray(callback);
    },
    function(records, callback) {
      // check permission on each asset
      var permitted = [];
      async.forEachSeries(records, function(record, callback) {
        brIdentity.checkPermission(
          actor, PERMISSIONS.ASSET_ACCESS, {
            resource: record.asset,
            translate: 'assetProvider',
            get: _getAssetForPermissionCheck
          }, function(err) {
            if(!err) {
              permitted.push(record);
              return _updateAsset(record, callback);
            }
            callback();
          });
      }, function(err) {
        callback(err, permitted);
      });
    }
  ], callback);
};

/**
 * Updates an existing hosted Asset.
 *
 * @param actor the Identity performing the action.
 * @param asset the Asset to update.
 * @param callback(err) called once the operation completes.
 */
api.updateAsset = function(actor, asset, callback) {
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.ASSET_EDIT, {
          resource: asset,
          translate: 'assetProvider',
          get: _getAssetForPermissionCheck
        }, callback);
    },
    function(callback) {
      // exclude restricted fields
      // FIXME: check dc:created?
      var update = brDatabase.buildUpdate(
        asset, 'asset', {exclude: ['asset.assetProvider', 'asset.sysStatus']});
      update.keywords = payswarm.tools.getAssetKeywords(asset);
      update['meta.updated'] = +new Date();
      if(asset.sysPublished) {
        update.published = new Date(asset.sysPublished);
      }
      brDatabase.collections.hostedAsset.update(
        {id: brDatabase.hash(asset.id)},
        {$set: update},
        brDatabase.writeOptions,
        callback);
    },
    function(result, callback) {
      if(result.result.n === 0) {
        callback(new BedrockError(
          'Could not update Asset. Asset not found.',
          MODULE_NS + '.AssetNotFound',
          {id: asset.id, 'public': true, httpStatusCode: 404}));
      } else {
        callback();
      }
    }
  ], function(err) {
    callback(err);
  });
};

/**
 * Removes a hosted Asset based on its ID.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Asset to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeAsset = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.ASSET_REMOVE, {
          resource: id,
          translate: 'assetProvider',
          get: _getAssetForPermissionCheck
        }, callback);
    },
    function(callback) {
      brDatabase.collections.hostedAsset.remove(
        {id: brDatabase.hash(id)},
        brDatabase.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Gets directory for the given Asset content URL.
 *
 * @param contentUrl the asset content URL.
 *
 * @return the directory for the Asset content.
 */
api.getAssetContentDirectory = function(contentUrl) {
  return PATH.normalize(PATH.dirname(
    URL.resolve(contentUrl, contentUrl))).replace(':/', '://') + '/';
};

/**
 * Gets the ID for a hosted Asset public key from the Asset's content URL.
 *
 * The ID scheme looks as follows:
 *
 * urn:hostedAssetPublicKey:<db hash of directory for asset's content url>
 *
 * @param contentUrl the content URL for the Asset.
 *
 * @return the hosted Asset public key ID.
 */
api.getAssetContentPublicKeyId = function(contentUrl) {
  // get directory for content URL
  var dir = api.getAssetContentDirectory(contentUrl);
  return 'urn:hostedAssetPublicKey:' + brDatabase.hash(dir);
};

/**
 * Sets the public key used to protect the content for a particular asset. This
 * will overwrite any existing public key, which will disable access to any
 * content hosted in the same base directory as the asset's content URL until
 * the new associated private key is put into place. The given public key's ID
 * will be updated to use the hosted asset public key scheme (see
 * getAssetContentPublicKeyId).
 *
 * @param actor the Identity performing the action.
 * @param assetId the ID of the Asset.
 * @param publicKey the PublicKey to associate with the asset's content URL.
 * @param callback(err) called once the operation completes.
 */
api.setAssetContentPublicKey = function(actor, assetId, publicKey, callback) {
  async.waterfall([
    // get the asset
    function(callback) {
      api.getAsset(null, assetId, function(err, asset) {
        callback(err, asset);
      });
    },
    // ensure actor can update asset
    function(asset, callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.ASSET_EDIT,
        {resource: asset, translate: 'assetProvider'}, function(err) {
          callback(err, asset);
        });
    },
    function(asset, callback) {
      // generate ID for public key
      publicKey.id = api.getAssetContentPublicKeyId(asset.assetContent);

      // do upsert
      var idHash = brDatabase.hash(publicKey.id);
      brDatabase.collections.hostedAssetPublicKey.update(
        {id: idHash},
        {$set: {
          id: idHash,
          publicKey: publicKey,
          'meta.updated': +new Date(),
          'meta.contentDirectory': api.getAssetContentDirectory(
            asset.assetContent)
        }},
        bedrock.util.extend({}, brDatabase.writeOptions, {upsert: true}),
        callback);
    },
    function(result, callback) {
      if(result.result.n === 0) {
        return callback(new BedrockError(
          'Could not update Asset content public key. Asset not found.',
          MODULE_NS + '.AssetNotFound',
          {id: assetId, 'public': true, httpStatusCode: 404}));
      }
      callback();
    }
  ], callback);
};

/**
 * Gets the public key used to protect the content for a particular asset. If
 * no public key has been associated, then null will be passed as the public
 * key in the callback.
 *
 * @param asset the asset with ID or assetContent set.
 * @param callback(err, publicKey, meta) called once the operation completes.
 */
api.getAssetContentPublicKey = function(asset, callback) {
  async.waterfall([
    // ensure assetContent is populated
    function(callback) {
      if(asset.assetContent) {
        return callback(null, asset);
      }
      api.getAsset(null, asset.id, function(err, asset) {
        callback(err, asset);
      });
    },
    function(asset, callback) {
      // generate ID for public key
      var id = api.getAssetContentPublicKeyId(asset.assetContent);
      brDatabase.collections.hostedAssetPublicKey.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(null, null);
      }
      callback(null, record.publicKey, record.meta);
    }
  ], callback);
};

/**
 * Generates a new key-pair for the given Asset content URL. This will
 * overwrite any existing key-pair, which will disable access to any
 * content hosted in the same base directory as the content URL until
 * the new key is put into place.
 *
 * @param actor the Identity performing the action.
 * @param contentUrl the Asset content URL.
 * @param callback(err, publicKey, privateKey) called once the operation
 *          completes.
 */
api.createAssetContentKeyPair = function(actor, contentUrl, callback) {
  // TODO: implement to support server-side RSA keygen if ever necessary,
  // right now, only client-side is implemented which is preferred

  /*
  var keypair = ursa.generatePrivateKey(KEY_SIZE, KEY_RSA_E);

  var privateKey = keypair.toPrivatePem('utf8');
  var publicKey = keypair.toPublicPem('utf8');

  var computecluster = require('compute-cluster');
  var cc = new computecluster({
    module: './worker.js'
  });
  var done = 0;
  for(var i = 0; i < 10; ++i) {
    cc.enqueue({keySize: KEY_SIZE}, function(err, result) {
      if(err) {
        console.log('err', err);
      }
      console.log('result', result);
      if(++done === 10) {
        cc.exit();
      }
    });
  }*/

  /*
  var ursa = require('ursa');
  process.on('message', function(m) {
    console.log(process.pid + ': generating RSA key (' + m.keySize + ')');
    var start = process.hrtime();
    var keypair = ursa.generatePrivateKey(m.keySize, KEY_RSA_E);
    var end = process.hrtime(start);
    console.log(process.pid + ': time', (end[1]/1000000) + 'ms');
    var privateKey = keypair.toPrivatePem('utf8');
    var publicKey = keypair.toPublicPem('utf8');
    process.send({privateKey: privateKey, publicKey: publicKey});
  });*/
};

/**
 * Updates the given Asset record, signing its Asset if it has been published
 * and it has not been signed or its purchase validity period has expired.
 *
 * @param record the record with the Asset.
 * @param callback(err, record) called once the operation completes.
 */
function _updateAsset(record, callback) {
  var asset = record.asset;

  // asset not published, make no changes
  if(!asset.sysPublished) {
    return callback(null, record);
  }

  // check publication date
  var published = new Date(asset.sysPublished);
  var now = new Date();

  // published in the future, make no changes
  if(now < published) {
    return callback(null, record);
  }

  // check for signature and purchase validity period
  var isSigned = jsonld.hasProperty(asset, 'signature');
  var validity = payswarm.tools.checkPurchaseValidity(asset);

  // validity period is now and signed, make no changes
  if(validity === 0 && isSigned) {
    return callback(null, record);
  }

  // validity period invalid, update it and resign
  var duration = bedrock.config.hosted.asset.purchaseValidityDuration;
  var end = new Date(+now + duration);
  asset.listingRestrictions.validFrom = bedrock.util.w3cDate(now);
  asset.listingRestrictions.validUntil = bedrock.util.w3cDate(end);

  async.waterfall([
    function(callback) {
      // get key-pair without permission check
      payswarm.authority.getAuthorityKeyPair(null, callback);
    },
    function(publicKey, privateKey, callback) {
      payswarm.security.signJsonLd(asset, {
        key: privateKey,
        creator: publicKey.id
      }, callback);
    },
    function(signed, callback) {
      // hash signed asset
      payswarm.security.hashJsonLd(signed, function(err, hash) {
        signed.sysAssetHash = hash;
        callback(err, signed);
      });
    },
    function(signed, callback) {
      now = +new Date();
      api.updateAsset(null, signed, function(err) {
        record.asset = signed;
        if(record.meta) {
          record.meta.updated = now;
        }
        callback(err, record);
      });
    }
  ], callback);
}

/**
 * Gets an Asset during a permission check.
 *
 * @param asset the Asset to get.
 * @param options the options to use.
 * @param callback(err, asset) called once the operation completes.
 */
function _getAssetForPermissionCheck(asset, options, callback) {
  if(typeof asset === 'object') {
    asset = asset.id || '';
  }
  api.getAsset(null, asset, function(err, asset) {
    callback(err, asset);
  });
}
