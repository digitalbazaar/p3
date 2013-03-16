/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
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
    function(asset, callback) {
      // hash listing
      payswarm.security.hashJsonLd(listing, function(err, hash) {
        listing.psaListingHash = hash;
        callback(err);
      });
    },
    function(listing, callback) {
      payswarm.logger.debug('creating listing', listing);

      // insert listing
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(listing.id),
        vendor: payswarm.db.hash(listing.vendor),
        asset: payswarm.db.hash(listing.asset),
        meta: {
          created: now,
          updated: now
        },
        listing: listing
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
      callback(null, record.listing, record.meta);
    },
    function(listing, meta, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, listing,
        PERMISSIONS.LISTING_ADMIN, PERMISSIONS.LISTING_ACCESS,
        _checkListingVendor, function(err) {
          callback(err, listing, meta);
        });
    },
    function(listing, meta, callback) {
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
 * @param callback(err) called once the operation completes.
 */
api.updateListing = function(actor, listing, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, listing,
        PERMISSIONS.LISTING_ADMIN, PERMISSIONS.LISTING_EDIT,
        _checkListingVendor, callback);
    },
    function(callback) {
      // remove restricted fields
      listing = payswarm.tools.clone(listing);
      delete listing.vendor;
      delete listing.psaStatus;
      payswarm.db.collections.hostedListing.update(
        {id: payswarm.db.hash(listing.id)},
        {$set: payswarm.db.buildUpdate(listing, 'listing')},
        payswarm.db.writeOptions,
        callback);
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
 * Updates the given Listing record, signing its Listing if it has been published
 * and it has not been signed or its purchase validity period has expired.
 *
 * @param record the record with the Listing.
 * @param callback(err, listing) called once the operation completes.
 */
function _updateListing(record, callback) {
  var listing = record.listing;

  // listing not published, make no changes
  if(!listing.psaPublished) {
    return callback(null, record);
  }

  // check publication date
  var published = new Date(listing.psaPublished);
  var now = new Date();

  // published in the future, make no changes
  if(now < published) {
    return callback(null, record);
  }

  async.auto({
    getAssetHash: function(callback) {
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
        callback(null, records[0].hash);
      });
    },
    check: ['getAssetHash', function(callback, results) {
      // check asset hash and purchase validity period
      var assetHash = results.getAssetHash;
      var validity = payswarm.tools.checkPurchaseValidity(listing);
      if(validity === 0 && listing.assetHash === assetHash) {
        return callback();
      }

      // validity period invalid or asset hash changed, update it and resign
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
        },
        function(signed, callback) {
          now = +new Date();
          api.updateListing(null, signed, function(err) {
            record.listing = signed;
            if(record.meta) {
              record.meta.updated = now;
            }
            callback(err, record);
          });
        }
      ], callback);
    }]
  }, function(err) {
    // asset not found, do not update listing, just add error property
    if(err && err.type && err.type === 'payswarm.resource.ResourceNotFound') {
      listing.psaError = 'payswarm.resource.AssetNotFound';
    }
    callback(err, record);
  });
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
        callback(null, listing);
      }
      else {
        api.getListing(actor, listing.id, function(err, listing) {
          callback(err, listing);
        });
      }
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
