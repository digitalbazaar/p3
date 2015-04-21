/*
 * Copyright (c) 2013-2014 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  authority: require('./authority'),
  resource: require('./resource'),
  security: require('./security'),
  tools: require('./tools')
};
var util = require('util');
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

// constants
var MODULE_NS = 'payswarm.hosted.listing';

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// module API
var api = {};
api.name = MODULE_NS;
module.exports = api;

// distributed ID generator
var listingIdGenerator = null;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  var collectionName = 'hostedListing';

  async.waterfall([
    function(callback) {
      // open all necessary collections
      brDatabase.openCollections([collectionName], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      brDatabase.createIndexes([{
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
    function(callback) {
      brDatabase.getDistributedIdGenerator(collectionName,
        function(err, idGenerator) {
          if(!err) {
            listingIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
});

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
 * @param actor the Identity performing the action.
 * @param listing the new Listing to create.
 * @param callback(err, record) called once the operation completes.
 */
api.createListing = function(actor, listing, callback) {
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.LISTING_CREATE,
        {resource: listing, translate: 'vendor'}, callback);
    },
    function(callback) {
      // get related asset (asset must be published before creating listing)
      var query = {
        id: listing.asset,
        type: 'Asset',
        strict: true,
        // FIXME: is fresh needed?
        fresh: true,
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
        listing.sysListingHash = hash;
        callback(err, asset);
      });
    },
    function(asset, callback) {
      logger.debug('creating listing', listing);

      // insert listing
      var now = +new Date();
      var record = {
        id: brDatabase.hash(listing.id),
        created: new Date(listing.created),
        vendor: brDatabase.hash(listing.vendor),
        asset: brDatabase.hash(listing.asset),
        keywords: payswarm.tools.getAssetKeywords(asset),
        lastNotification: null,
        meta: {
          created: now,
          updated: now
        },
        // include full asset
        listing: bedrock.util.extend({}, listing, {asset: asset})
      };
      // allows querying on published date
      if(listing.sysPublished) {
        record.published = new Date(listing.sysPublished);
      }
      brDatabase.collections.hostedListing.insert(
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
 * Gets the hosted Listing by ID.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the Listing to retrieve.
 * @param callback(err, listing, meta) called once the operation completes.
 */
api.getListing = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      brDatabase.collections.hostedListing.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new BedrockError(
          'Listing not found.',
          MODULE_NS + '.ListingNotFound',
          {id: id, 'public': true, httpStatusCode: 404}));
      }
      callback(null, record);
    },
    function(record, callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.LISTING_ACCESS,
        {resource: record.listing, translate: 'vendor'}, function(err) {
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
 * @param actor the Identity performing the action.
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
      brDatabase.collections.hostedListing.find(
        query, fields, options).toArray(callback);
    },
    function(records, callback) {
      // check permission on each listing
      var permitted = [];
      async.eachSeries(records, function(record, callback) {
        brIdentity.checkPermission(
          actor, PERMISSIONS.LISTING_ACCESS, {
            resource: record.listing,
            translate: 'vendor',
            get: _getListingForPermissionCheck
          }, function(err) {
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
 * @param actor the Identity performing the action.
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
      brIdentity.checkPermission(
        actor, PERMISSIONS.LISTING_EDIT, {
          resource: listing,
          translate: 'vendor',
          get: _getListingForPermissionCheck
        }, callback);
    },
    function(callback) {
      // if asset is not null, listing is already fresh
      if(asset !== null) {
        return callback(null, listing, asset);
      }
      _refreshListing(listing, {force: true}, callback);
    },
    function(listing, asset, callback) {
      // include full asset, exclude restricted fields
      delete asset['@context'];
      listing.asset = asset;
      // FIXME: check dc:created?
      var update = brDatabase.buildUpdate(
        listing, 'listing', {exclude: ['listing.vendor', 'listing.sysStatus']});
      update.keywords = payswarm.tools.getAssetKeywords(listing.asset);
      update.lastNotification = null;
      update['meta.updated'] = +new Date();
      if(listing.sysPublished) {
        update.published = new Date(listing.sysPublished);
      }
      brDatabase.collections.hostedListing.update(
        {id: brDatabase.hash(listing.id)}, {$set: update},
        brDatabase.writeOptions, callback);
    },
    function(result, callback) {
      if(result.result.n === 0) {
        callback(new BedrockError(
          'Could not update Listing. Listing not found.',
          MODULE_NS + '.ListingNotFound',
          {id: listing.id, 'public': true, httpStatusCode: 404}));
      } else {
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
 * @param actor the Identity performing the action.
 * @param id the ID of the Listing to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeListing = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.LISTING_REMOVE, {
          resource: id,
          translate: 'vendor',
          get: _getListingForPermissionCheck
        }, callback);
    },
    function(callback) {
      brDatabase.collections.hostedListing.remove(
        {id: brDatabase.hash(id)},
        brDatabase.writeOptions,
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
      record.listing.sysError = 'payswarm.resource.AssetNotFound';
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
    if(!listing.sysPublished) {
      return callback(null, listing, null);
    }

    // check publication date
    var published = new Date(listing.sysPublished);
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
        var assetRecord = records[0];
        var asset = assetRecord.resource;

        // ensure asset validity period hasn't expired
        var assetValidity = payswarm.tools.checkPurchaseValidity(asset);
        if(assetValidity >= 0) {
          return callback(null, assetRecord);
        }

        // TODO: allow the vendor to configure this so they are notified
        // instead of this reselling a new asset automatically (they may
        // want to review the asset first)

        // get a more fresh asset
        query.fresh = true;
        payswarm.resource.asset.get(query, function(err, records) {
          if(err) {
            return callback(err);
          }
          callback(null, records[0]);
        });
      });
    },
    check: ['getAsset', function(callback, results) {
      var assetRecord = results.getAsset;
      var asset = assetRecord.resource;
      var assetHash = assetRecord.hash;

      // check purchase validity of asset
      var assetValidity = payswarm.tools.checkPurchaseValidity(asset);
      if(assetValidity < 0) {
        var err = new BedrockError(
          'The time during which the listing\'s Asset could be purchased ' +
          'has expired.', MODULE_NS + '.AssetExpired', {
            'httpStatusCode': 400, 'public': true,
            expired: jsonld.getValues(
              jsonld.getValues(asset, 'listingRestrictions')[0],
              'validUntil')[0]
          });

        // notify vendor of expired asset, if not already notified
        return async.waterfall([
          function(callback) {
            brDatabase.collections.hostedListing.findOne({
              id: brDatabase.hash(listing.id),
              lastNotification: {$ne: 'assetValidity'}
            }, {id: true}, callback);
          },
          function(record, callback) {
            if(record !== null) {
              var event = {
                type: 'hosted.Listing.assetExpired',
                details: {
                  triggers: ['getIdentity'],
                  identityId: listing.vendor,
                  asset: asset,
                  listing: listing,
                  error: err
                }
              };
              bedrock.events.emitLater(event);

              // do update, ignore result
              brDatabase.collections.hostedListing.update(
                {id: brDatabase.hash(listing.id)},
                {$set: {lastNotification: 'assetValidity'}},
                brDatabase.writeOptions, function() {});
            }
            callback();
          }
        ], function() {
          callback(err);
        });
      }

      // refresh not forced
      if(!options.force) {
        // if purchase validity period is now and signed and asset hash has
        // not changed there is no need to refresh
        var isSigned = jsonld.hasProperty(listing, 'signature');
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
      if(!listing.sysPublished) {
        return callback(null, listing, asset);
      }

      var published = new Date(listing.sysPublished);
      var now = new Date();

      // listing published in the future, refresh done
      if(now < published) {
        return callback(null, listing, asset);
      }

      // update purchase validity period and resign
      var duration = bedrock.config.hosted.listing.purchaseValidityDuration;
      var end = new Date(+now + duration);

      // limit end of validity period to asset listing restrictions
      if(jsonld.hasProperty(asset, 'listingRestrictions') &&
        asset.listingRestrictions.length > 0 &&
        jsonld.hasProperty(asset.listingRestrictions[0], 'validUntil')) {
        var assetValidUntil = new Date(
          asset.listingRestrictions[0].validUntil[0]);
        if(end > assetValidUntil) {
          end = assetValidUntil;
        }
      }
      listing.validFrom = bedrock.util.w3cDate(now);
      listing.validUntil = bedrock.util.w3cDate(end);

      // replace asset with reference only
      listing.asset = listing.asset.id;

      async.waterfall([
        function(callback) {
          // get key-pair without permission check
          payswarm.authority.getAuthorityKeyPair(null, callback);
        },
        function(publicKey, privateKey, callback) {
          payswarm.security.signJsonLd(listing, {
            key: privateKey,
            creator: publicKey.id
          }, callback);
        },
        function(listing, callback) {
          // hash signed listing
          payswarm.security.hashJsonLd(listing, function(err, hash) {
            listing.sysListingHash = hash;
            callback(err, listing);
          });
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
 * Gets a Listing during a permission check.
 *
 * @param listing the Listing to get.
 * @param options the options to use.
 * @param callback(err, listing) called once the operation completes.
 */
function _getListingForPermissionCheck(listing, options, callback) {
  if(typeof listing === 'object') {
    listing = listing.id || '';
  }
  api.getListing(null, listing, function(err, listing) {
    callback(err, listing);
  });
}
