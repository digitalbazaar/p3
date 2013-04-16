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
  resource: require('./resource'),
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
  LISTING_ADMIN: MODULE_IRI + '#listing_admin',
  LISTING_ACCESS: MODULE_IRI + '#listing_access',
  LISTING_CREATE: MODULE_IRI + '#listing_create',
  LISTING_EDIT: MODULE_IRI + '#listing_edit',
  LISTING_REMOVE: MODULE_IRI + '#listing_remove'
};

// module API
var api = {};
api.name = MODULE_TYPE + '.Listing';
module.exports = api;

// distributed ID generator
var listingIdGenerator = null;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  var collectionName = 'hostedListing';

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
        fields: {vendor: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        collection: collectionName,
        fields: {vendor: 1, asset: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        collection: collectionName,
        fields: {vendor: 1, keywords: 1, created: 1, id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      payswarm.db.getDistributedIdGenerator(collectionName,
        function(err, idGenerator) {
          if(!err) {
            listingIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
};

/**
 * Creates a hosted Listing ID from the given Identity ID and Listing slug.
 *
 * @param vendorId the Identity ID.
 * @param name the short Listing name (slug).
 *
 * @return the hosted Listing ID.
 */
api.createListingId = function(vendorId, name) {
  return util.format('%s/listings/%s', vendorId, encodeURIComponent(name));
};

/**
 * Creates a new hosted Listing ID based on the listing vendor's Identity ID.
 *
 * @param vendorId the ID of the Identity that provides the Listing.
 * @param callback(err, id) called once the operation completes.
 */
api.generateListingId = function(vendorId, callback) {
  listingIdGenerator.generateId(function(err, id) {
    if(err) {
      return callback(err);
    }
    callback(null, api.createListingId(vendorId, id));
  });
};

/**
 * Creates a new hosted Listing. The "id" (and all other Listing fields) must be
 * set.
 *
 * @param actor the Profile performing the action.
 * @param listing the new Listing to create.
 * @param callback(err, record) called once the operation completes.
 */
api.createListing = function(actor, listing, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, listing,
        PERMISSIONS.LISTING_ADMIN, PERMISSIONS.LISTING_CREATE,
        _checkListingVendor, callback);
    },
    function(callback) {
      // get related asset (asset must be published before creating listing)
      var query = {
        id: listing.asset,
        type: 'Asset',
        strict: true,
        fetch: true,
        validate: true
      };
      payswarm.resource.asset.get(query, function(err, records) {
        if(err) {
          return callback(err);
        }
        listing.assetHash = records[0].hash;
        var asset = records[0].resource;
        delete asset['@context'];
        callback(null, asset);
      });
    },
    function(asset, callback) {
      // hash listing
      payswarm.security.hashJsonLd(listing, function(err, hash) {
        listing.psaListingHash = hash;
        callback(err, asset);
      });
    },
    function(asset, callback) {
      payswarm.logger.debug('creating listing', listing);

      // insert listing
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(listing.id),
        vendor: payswarm.db.hash(listing.vendor),
        asset: payswarm.db.hash(listing.asset),
        keywords: _getKeywords(asset),
        meta: {
          created: now,
          updated: now
        },
        // include full asset
        listing: payswarm.tools.extend({}, listing, {asset: asset})
      };
      payswarm.db.collections.hostedListing.insert(
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
 * Gets the hosted Listing by ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Listing to retrieve.
 * @param callback(err, listing, meta) called once the operation completes.
 */
api.getListing = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.hostedListing.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Listing not found.',
          MODULE_TYPE + '.ListingNotFound', {id: id}));
      }
      callback(null, record);
    },
    function(record, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, record.listing,
        PERMISSIONS.LISTING_ADMIN, PERMISSIONS.LISTING_ACCESS,
        _checkListingVendor, function(err) {
          callback(err, record);
        });
    },
    function(record, callback) {
      // update listing
      _updateListing(record, function(err, record) {
        return callback(err, record.listing, record.meta);
      });
    }
  ], callback);
};

/**
 * Gets hosted Listings based on the given query.
 *
 * @param actor the Profile performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 *
 * @return true on success, false on failure with exception set.
 */
api.getListings = function(actor, query, fields, options, callback) {
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
      payswarm.db.collections.hostedListing.find(
        query, fields, options).toArray(callback);
    },
    function(records, callback) {
      // check permission on each listing
      var permitted = [];
      async.forEachSeries(records, function(record, callback) {
        payswarm.profile.checkActorPermissionForObject(
          actor, record.listing,
          PERMISSIONS.LISTING_ADMIN, PERMISSIONS.LISTING_ACCESS,
          _checkListingVendor, function(err) {
            if(!err) {
              permitted.push(record);
              return _updateListing(record, callback);
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
 * Updates an existing hosted Listing.
 *
 * @param actor the Profile performing the action.
 * @param listing the Listing to update.
 * @param asset the related asset, null to retrieve the latest version.
 * @param callback(err) called once the operation completes.
 */
api.updateListing = function(actor, listing, asset, callback) {
  if(typeof asset === 'function') {
    callback = asset;
    asset = null;
  }

  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, listing,
        PERMISSIONS.LISTING_ADMIN, PERMISSIONS.LISTING_EDIT,
        _checkListingVendor, callback);
    },
    function(callback) {
      // if asset is not null, listing is already fresh
      if(asset !== null) {
        return callback(null, listing, asset);
      }
      _refreshListing(listing, {force: true}, callback);
    },
    function(listing, asset, callback) {
      // include full asset, remove restricted fields
      listing.asset = asset;
      delete listing.vendor;
      delete listing.psaStatus;
      // FIXME: check dc:created and update meta.created?
      var update = payswarm.db.buildUpdate(listing, 'listing');
      update.keywords = _getKeywords(listing.asset);
      update['meta.updated'] = +new Date();
      payswarm.db.collections.hostedListing.update(
        {id: payswarm.db.hash(listing.id)}, {$set: update},
        payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        callback(new PaySwarmError(
          'Could not update Listing. Listing not found.',
          MODULE_TYPE + '.ListingNotFound'));
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
 * Removes a hosted Listing based on its ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Listing to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeListing = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.LISTING_ADMIN, PERMISSIONS.LISTING_REMOVE,
        _checkListingVendor, callback);
    },
    function(callback) {
      payswarm.db.collections.hostedListing.remove(
        {id: payswarm.db.hash(id)},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Updates the given Listing record, refreshing it and writing it back to
 * the database only as needed.
 *
 * @param record the record with the Listing.
 * @param callback(err, record) called once the operation completes.
 */
function _updateListing(record, callback) {
  async.waterfall([
    function(callback) {
      _refreshListing(record.listing, callback);
    },
    function(listing, asset, callback) {
      // listing already fresh, short-circuit
      if(asset === null) {
        return callback();
      }
      // update database record
      var now = +new Date();
      api.updateListing(null, listing, asset, function(err) {
        if(err) {
          return callback(err);
        }
        record.listing = listing;
        if(record.meta) {
          record.meta.updated = now;
        }
        callback();
      });
    }
  ], function(err) {
    // asset not found, do not update listing, just add error property
    if(err && err.type && err.type === 'payswarm.resource.ResourceNotFound') {
      record.listing.psaError = 'payswarm.resource.AssetNotFound';
    }
    callback(err, record);
  });
}

/**
 * Refreshes the given Listing, if:
 *
 *  1. A refresh is forced, OR
 *  2. The Listing has a publication date that is not in the future and
 *    either the related Asset's hash changed or the purchase validity of
 *    the listing has expired.
 *
 * A "refresh" means that the Listing's Asset hash will be updated, and, if
 * the Listing has a publication date that is not in the future, the Listing
 * will be resigned using a new purchase validity period. If a refresh occurs,
 * the asset used in the refresh is returned in the callback, otherwise it will
 * be null.
 *
 * @param listing the Listing to potentially refresh.
 * @param options the options to use when refreshing.
 *          [force] forces a refresh of the Listing.
 * @param callback(err, listing, asset) called once the operation completes.
 */
function _refreshListing(listing, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  // refresh not forced
  if(!options.force) {
    // listing not published, no need to refresh
    if(!listing.psaPublished) {
      return callback(null, listing, null);
    }

    // check publication date
    var published = new Date(listing.psaPublished);
    var now = new Date();

    // published in the future, no need to refresh
    if(now < published) {
      return callback(null, listing, null);
    }
  }

  async.auto({
    getAsset: function(callback) {
      var query = {
        id: listing.asset.id,
        type: 'Asset',
        strict: true,
        fetch: true,
        validate: true
      };
      payswarm.resource.asset.get(query, function(err, records) {
        if(err) {
          return callback(err);
        }
        callback(null, records[0]);
      });
    },
    check: ['getAsset', function(callback, results) {
      var assetRecord = results.getAsset;
      var asset = assetRecord.resource;
      var assetHash = assetRecord.hash;

      // refresh not forced
      if(!options.force) {
        // if purchase validity period is now and signed and asset hash has
        // not changed there is no need to refresh
        var isSigned = jsonld.hasValue(listing, 'signature');
        var validity = payswarm.tools.checkPurchaseValidity(listing);
        if(validity === 0 && isSigned && listing.assetHash === assetHash) {
          return callback(null, listing, null);
        }
      }

      // TODO: Current code assumes no significant changes have been made
      // to the asset and just updates the asset hash. Perhaps we should be
      // doing a diff of some sort in the future so that vendors can be
      // warned (could be a costly operation)?

      // refresh asset hash
      listing.assetHash = assetHash;

      // listing not published yet, refresh done
      if(!listing.psaPublished) {
        return callback(null, listing, asset);
      }

      var published = new Date(listing.psaPublished);
      var now = new Date();

      // listing published in the future, refresh done
      if(now < published) {
        return callback(null, listing, asset);
      }

      // update purchase validity period and resign
      var duration = payswarm.config.hosted.listing.purchaseValidityDuration;
      var end = new Date(+now + duration);
      listing.validFrom = payswarm.tools.w3cDate(now);
      listing.validUntil = payswarm.tools.w3cDate(end);

      async.waterfall([
        function(callback) {
          // get key-pair without permission check
          payswarm.identity.getAuthorityKeyPair(null, callback);
        },
        function(publicKey, privateKey, callback) {
          payswarm.security.signJsonLd(
            listing, privateKey, publicKey.id, callback);
        }
      ], function(err, listing) {
        callback(err, listing, asset);
      });
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    callback(null, results.check[0], results.check[1]);
  });
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
 * Checks if an actor is owns the identity that provides the hosted Listing.
 *
 * @param actor the actor to compare against.
 * @param listing the Listing to compare.
 * @param callback(err, owns) called once the operation completes.
 */
function _checkListingVendor(actor, listing, callback) {
  async.waterfall([
    function(callback) {
      if('vendor' in listing) {
        return callback(null, listing);
      }
      api.getListing(actor, listing.id, function(err, listing) {
        callback(err, listing);
      });
    },
    function(listing, callback) {
      payswarm.identity.checkIdentityOwner(
        actor, {id: listing.vendor}, callback);
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
    id: PERMISSIONS.LISTING_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Hosted Listing Administration',
    comment: 'Required to administer hosted Listings.'
  }, {
    id: PERMISSIONS.LISTING_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Hosted Listing',
    comment: 'Required to access a hosted Listing.'
  }, {
    id: PERMISSIONS.LISTING_CREATE,
    psaModule: MODULE_IRI,
    label: 'Create Hosted Listing',
    comment: 'Required to create a hosted Listing.'
  }, {
    id: PERMISSIONS.LISTING_EDIT,
    psaModule: MODULE_IRI,
    label: 'Edit Hosted Listing',
    comment: 'Required to edit a hosted Listing.'
  }, {
    id: PERMISSIONS.LISTING_REMOVE,
    psaModule: MODULE_IRI,
    label: 'Remove Hosted Listing',
    comment: 'Required to remove a hosted Listing.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
