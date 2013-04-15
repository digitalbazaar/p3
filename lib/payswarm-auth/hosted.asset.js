/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  permission: require('./permission'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools')
};
var util = require('util');
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.hosted';
var MODULE_IRI = 'https://payswarm.com/modules/hosted';

// module permissions
var PERMISSIONS = {
  ASSET_ADMIN: MODULE_IRI + '#asset_admin',
  ASSET_ACCESS: MODULE_IRI + '#asset_access',
  ASSET_CREATE: MODULE_IRI + '#asset_create',
  ASSET_EDIT: MODULE_IRI + '#asset_edit',
  ASSET_REMOVE: MODULE_IRI + '#asset_remove'
};

// module API
var api = {};
api.name = MODULE_TYPE + '.Asset';
module.exports = api;

// distributed ID generator
var assetIdGenerator = null;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  var collectionName = 'hostedAsset';

  // do initialization work
  async.waterfall([
    function(callback) {
      // open all necessary collections
      payswarm.db.openCollections([collectionName], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: collectionName,
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        collection: collectionName,
        fields: {assetProvider: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        collection: collectionName,
        fields: {assetProvider: 1, keywords: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      payswarm.db.getDistributedIdGenerator(collectionName,
        function(err, idGenerator) {
          if(!err) {
            assetIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
};

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
 * @param actor the Profile performing the action.
 * @param asset the new Asset to create.
 * @param callback(err, record) called once the operation completes.
 */
api.createAsset = function(actor, asset, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, asset,
        PERMISSIONS.ASSET_ADMIN, PERMISSIONS.ASSET_CREATE,
        _checkAssetProvider, callback);
    },
    function(callback) {
      // hash asset
      payswarm.security.hashJsonLd(asset, function(err, hash) {
        asset.psaAssetHash = hash;
        callback(err);
      });
    },
    function(callback) {
      payswarm.logger.debug('creating asset', asset);

      // FIXME: ensure actor is authorized to set assetProvider indicated in
      // the Asset

      // insert asset
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(asset.id),
        assetProvider: payswarm.db.hash(asset.assetProvider),
        keywords: _getKeywords(asset),
        meta: {
          created: now,
          updated: now
        },
        asset: asset
      };
      payswarm.db.collections.hostedAsset.insert(
        record, payswarm.db.writeOptions, function(err, records) {
          if(err) {
            return callback(err);
          }
          callback(null, records[0]);
        });
    }
  ], callback);
};

/**
 * Gets the hosted Asset by ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Asset to retrieve.
 * @param callback(err, asset, meta) called once the operation completes.
 */
api.getAsset = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.hostedAsset.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Asset not found.',
          MODULE_TYPE + '.AssetNotFound', {id: id}));
      }
      callback(null, record.asset, record.meta);
    },
    function(asset, meta, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, asset,
        PERMISSIONS.ASSET_ADMIN, PERMISSIONS.ASSET_ACCESS,
        _checkAssetProvider, function(err) {
          callback(err, asset, meta);
        });
    },
    function(asset, meta, callback) {
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
 * @param actor the Profile performing the action.
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
  }
  else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  }
  else if(typeof options === 'function') {
    callback = options;
    options = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  async.waterfall([
    function(callback) {
      payswarm.db.collections.hostedAsset.find(
        query, fields, options).toArray(callback);
    },
    function(records, callback) {
      // check permission on each asset
      var permitted = [];
      async.forEachSeries(records, function(record, callback) {
        payswarm.profile.checkActorPermissionForObject(
          actor, record.asset,
          PERMISSIONS.ASSET_ADMIN, PERMISSIONS.ASSET_ACCESS,
          _checkAssetProvider, function(err) {
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
 * @param actor the Profile performing the action.
 * @param asset the Asset to update.
 * @param callback(err) called once the operation completes.
 */
api.updateAsset = function(actor, asset, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, asset,
        PERMISSIONS.ASSET_ADMIN, PERMISSIONS.ASSET_EDIT,
        _checkAssetProvider, callback);
    },
    function(callback) {
      // remove restricted fields
      asset = payswarm.tools.clone(asset);
      delete asset.assetProvider;
      delete asset.psaStatus;
      // FIXME: check dc:created and update meta.created?
      var update = payswarm.db.buildUpdate(asset, 'asset');
      update.keywords = _getKeywords(asset);
      payswarm.db.collections.hostedAsset.update(
        {id: payswarm.db.hash(asset.id)},
        {$set: update},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not update Asset. Asset not found.',
          MODULE_TYPE + '.AssetNotFound'));
      }
      else {
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
 * @param actor the Profile performing the action.
 * @param id the ID of the Asset to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeAsset = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.ASSET_ADMIN, PERMISSIONS.ASSET_REMOVE,
        _checkAssetProvider, callback);
    },
    function(callback) {
      payswarm.db.collections.hostedAsset.remove(
        {id: payswarm.db.hash(id)},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
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
  if(!asset.psaPublished) {
    return callback(null, record);
  }

  // check publication date
  var published = new Date(asset.psaPublished);
  var now = new Date();

  // published in the future, make no changes
  if(now < published) {
    return callback(null, record);
  }

  // check purchase validity period
  var validity = payswarm.tools.checkPurchaseValidity(asset);

  // validity period is now, make no changes
  if(validity === 0) {
    return callback(null, record);
  }

  // validity period invalid, update it and resign
  var duration = payswarm.config.hosted.asset.purchaseValidityDuration;
  var end = new Date(+now + duration);
  asset.listingRestrictions.validFrom = payswarm.tools.w3cDate(now);
  asset.listingRestrictions.validUntil = payswarm.tools.w3cDate(end);

  async.waterfall([
    function(callback) {
      // get key-pair without permission check
      payswarm.identity.getAuthorityKeyPair(null, callback);
    },
    function(publicKey, privateKey, callback) {
      payswarm.security.signJsonLd(
        asset, privateKey, publicKey.id, callback);
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
 * Gets the searchable keywords from an Asset.
 *
 * @param asset the Asset to get searchable keywords from.
 *
 * @return the keywords.
 */
function _getKeywords(asset) {
  var text = '';
  var titles = jsonld.getValues(asset, 'title');
  var creators = jsonld.getValues(asset, 'creator');

  // add text from title
  titles.forEach(function(title) {
    text += ' ' + title;
  });

  // add text from creators
  creators.forEach(function(creator) {
    if(_.isString(creator)) {
      text += ' ' + creator;
    }
    else if(_.isObject(creator)) {
      _.each(creator, function(value, key) {
        if(_.isString(value)) {
          text += ' ' + value;
        }
      });
    }
  });

  // remove all punctuation and split on whitespace
  var keywords = text.toLowerCase().replace(/[^a-z0-9~\-_]/g, ' ').split(/\s/);

  // remove empty keywords and make them unique
  return _.uniq(_.filter(keywords, function(value) {
    return value.length > 0;
  }));
}

/**
 * Checks if an actor is owns the identity that provides the hosted Asset.
 *
 * @param actor the actor to compare against.
 * @param asset the Asset to compare.
 * @param callback(err, owns) called once the operation completes.
 */
function _checkAssetProvider(actor, asset, callback) {
  async.waterfall([
    function(callback) {
      if('assetProvider' in asset) {
        return callback(null, asset);
      }
      api.getAsset(actor, asset.id, function(err, asset) {
        callback(err, asset);
      });
    },
    function(asset, callback) {
      payswarm.identity.checkIdentityOwner(
        actor, {id: asset.assetProvider}, callback);
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
    id: PERMISSIONS.ASSET_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Hosted Asset Administration',
    comment: 'Required to administer hosted Assets.'
  }, {
    id: PERMISSIONS.ASSET_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Hosted Asset',
    comment: 'Required to access a hosted Asset.'
  }, {
    id: PERMISSIONS.ASSET_CREATE,
    psaModule: MODULE_IRI,
    label: 'Create Hosted Asset',
    comment: 'Required to create a hosted Asset.'
  }, {
    id: PERMISSIONS.ASSET_EDIT,
    psaModule: MODULE_IRI,
    label: 'Edit Hosted Asset',
    comment: 'Required to edit a hosted Asset.'
  }, {
    id: PERMISSIONS.ASSET_REMOVE,
    psaModule: MODULE_IRI,
    label: 'Remove Hosted Asset',
    comment: 'Required to remove a hosted Asset.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
