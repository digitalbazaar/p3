/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  hosted: {
    asset: require('./hosted.asset'),
    listing: require('./hosted.listing')
  },
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  security: require('./security'),
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
var validate = payswarm.validation.validate;
var getDefaultViewVars = payswarm.website.getDefaultViewVars;

// constants
var MODULE_TYPE = payswarm.website.type;
var MODULE_IRI = payswarm.website.iri;

// sub module API
var api = {};
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      addServices(app, callback);
    }
  ], callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  // create new hosted listing
  app.server.post('/i/:identity/listings',
    ensureAuthenticated,
    validate('services.hosted.listing.postListings'),
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      async.waterfall([
        function(callback) {
          // generate listing ID
          payswarm.hosted.listing.generateListingId(identityId, callback);
        },
        function(listingId, callback) {
          var listing = req.body;
          listing.id = listingId;
          listing.listingProvider = identityId;
          payswarm.hosted.listing.createListing(
            req.user.profile, listing, callback);
        }
      ], function(err, record) {
        if(err) {
          err = new PaySwarmError(
            'The Listing could not be added.',
            MODULE_TYPE + '.AddListingFailed', {'public': true}, err);
          return next(err);
        }
        // return listing
        res.set('Location', record.listing.id);
        res.json(201, record.listing);
      });
    });

  // update existing hosted listing
  app.server.post('/i/:identity/listings/:listing',
    ensureAuthenticated,
    validate('services.hosted.listing.postListing'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var listingId = payswarm.hosted.listing.createListingId(
        identityId, req.params.listing);

      async.waterfall([
        function(callback) {
          // update listing
          var listing = req.body;
          listing.id = listingId;
          payswarm.hosted.listing.updateListing(
            req.user.profile, listing, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
    });

  // get hosted listing
  app.server.get('/i/:identity/listings/:listing',
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var listingId = payswarm.hosted.listing.createListingId(
        identityId, req.params.listing);

      async.waterfall([
        function(callback) {
          payswarm.hosted.listing.getListing(null, listingId, callback);
        },
        function(listing, meta, callback) {
          function ldjson() {
            res.json(listing);
          }
          res.format({
            'application/ld+json': ldjson,
            json: ldjson,
            html: function() {
              payswarm.identity.getIdentity(
                null, identityId, function(err, identity, identityMeta) {
                  if(err) {
                    return next(err);
                  }

                  // FIXME: this should be in the DB already
                  identity['@context'] =
                    payswarm.tools.getDefaultJsonLdContextUrl();

                  // determine if requestor is the owner of the identity
                  var isOwner = req.isAuthenticated() &&
                    identity.owner === req.user.profile.id;
                  if(!isOwner) {
                    // only include public info
                    var publicIdentity = {
                      '@context': payswarm.tools.getDefaultJsonLdContextUrl(),
                      id: identity.id,
                      type: identity.type
                    };
                    identity.psaPublic.forEach(function(field) {
                      publicIdentity[field] = identity[field];
                    });
                    identity = publicIdentity;
                  }

                  payswarm.website.getDefaultViewVars(req, function(err, vars) {
                    if(err) {
                      return next(err);
                    }
                    vars.listing = listing;
                    vars.identity = identity;
                    vars.identityMeta = identityMeta;
                    vars.clientData.listingId = listingId;
                    res.render('listing.tpl', vars);
                  });
                });
            },
            'default': function() {
              res.send(406);
            }
          });
        }
      ], function(err) {
        if(err) {
          next(err);
        }
      });
    });

  // get hosted listings
  app.server.get('/i/:identity/listings',
    validate({query: 'services.hosted.listing.getListingsQuery'}),
    _getListings);

  // process a receipt
  app.server.post('/i/:identity/receipts',
    validate('services.hosted.listing.postReceipt'),
    function(req, res, next) {
      // get ID from URL, receipt from body
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      // JSON parse receipt
      try {
        var receipt = JSON.parse(req.body.receipt);
      }
      catch(ex) {
        return callback(new PaySwarmError(
          'Could not process Receipt; malformed JSON.',
          MODULE_TYPE + '.MalformedJSON',
          {'public': true, httpStatusCode: 400}));
      }

      var publicKey;
      async.waterfall([
        function(callback) {
          // validate the receipt
          validate('receipt', receipt, callback);
        },
        function(callback) {
          // FIXME: may have to get the public key externally, can come
          // from any trusted PA
          // get signature public key
          payswarm.identity.getIdentityPublicKey(
            {id: receipt.signature.creator}, function(err, pkey) {
              if(err) {
                return callback(err);
              }
              publicKey = pkey;
              callback();
            });
        },
        function(callback) {
          // FIXME: ensure *any trusted* authority owns the key, not just
          // our authority
          // ensure authority owns the key
          if(publicKey.owner !== payswarm.config.authority.id) {
            return callback(new PaySwarmError(
              'Could not process Receipt; it was not signed by a trusted ' +
              'PaySwarm Authority.',
              MODULE_TYPE + '.InvalidReceiptSigner',
              {'public': true, httpStatusCode: 400}));
          }

          // ensure vendor ID matches identity ID
          if(receipt.contract.vendor !== identityId) {
            return callback(new PaySwarmError(
              'Could not process Receipt for the given Vendor; the Vendor ' +
              'ID does not match the value in the Receipt.',
              {'public': true, httpStatusCode: 400}));
          }

          // verify signature
          payswarm.security.verifyJsonLd(receipt, publicKey, callback);
        },
        function(verified, callback) {
          if(!verified) {
            return callback(new PaySwarmError(
              'Could not process Receipt; its digital signature could not be ' +
              'verified.', MODULE_TYPE + '.InvalidReceiptSignature'));
          }
          // get hosted asset
          // FIXME: check receipt.contract.asset.id too
          var assetId = receipt.contract.asset;
          payswarm.hosted.asset.getAsset(null, assetId, function(err, asset) {
            callback(err, asset);
          });
        },
        function(asset, callback) {
          // get asset content public key
          payswarm.hosted.asset.getAssetContentPublicKey(
            asset, function(err, publicKey) {
              callback(err, asset, publicKey);
            });
        },
        function(asset, publicKey, callback) {
          // no public key associated, a receipt isn't needed because there's
          // no (known) content protection scheme in place at the content
          // URL so pass null for the encrypted receipt
          if(publicKey === null) {
            return callback(null, asset, null);
          }

          // encrypt receipt
          payswarm.security.encryptJsonLd(
            receipt, publicKey, function(err, encryptedReceipt) {
              callback(err, asset, encryptedReceipt);
            });
        }
      ], function(err, asset, encryptedReceipt) {
        if(err) {
          err = new PaySwarmError(
            'The Receipt could not be processed.',
            MODULE_TYPE + '.ProcessReceiptFailed', {'public': true}, err);
          return next(err);
        }

        getDefaultViewVars(req, function(err, vars) {
          if(err) {
            return next(err);
          }

          // display page that can redirect user to see purchased content
          vars.clientData.encryptedReceipt = encryptedReceipt;
          vars.clientData.asset = asset;
          res.render('content-portal.tpl', vars);
        });
      });
    });

  callback(null);
}

/**
 * Handles a request to get Listings.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getListings(req, res, next) {
  var identityId = payswarm.identity.createIdentityId(req.params.identity);

  // create default query options
  var options = {
    createdStart: _parseDate(req.query.createdStart) || new Date(),
    createdEnd: _parseDate(req.query.createdEnd) || null,
    previous: req.query.previous || null,
    limit: Math.abs(Math.min(30, req.query.limit || 30))
    // FIXME: implement other query vars
  };

  // determine whether or not asset data should be included
  var excludeAsset = true;
  if(req.query.includeAsset === 'true') {
    excludeAsset = false;
  }

  // start building query
  var query = {};
  query.vendor = payswarm.db.hash(identityId);
  query['meta.created'] = {$lte: +options.createdStart};
  if(options.createdEnd !== null) {
    query['meta.created'].$gte = +options.createdEnd;
  }
  if(req.query.keywords) {
    var keywords = _.uniq(req.query.keywords
        .toLowerCase().replace(/[^a-z0-9~\-_]/g, ' ')
        .split(/\s/)
        .filter(function(e) {
          return e.length > 0;
        }));
    if(keywords.length > 0) {
      query.keywords = {$in: keywords};
    }
  }
  if(req.query.asset) {
    query.asset = payswarm.db.hash(req.query.asset);
  }

  // if request user does not match the identity, only show published listings
  if(!req.user || !req.user.identity || req.user.identity.id !== identityId) {
    query.published = {$lte: +new Date()};
  }

  async.waterfall([
    function(callback) {
      // run query
      var opts = {sort: {created: -1, id: 1}, limit: options.limit};
      if(options.previous !== null) {
        opts.min = {};
        opts.min.vendor = query.vendor;
        opts.min['meta.created'] = +options.createdStart;
        opts.min.id = payswarm.db.hash(options.previous);
        opts.skip = 1;
      }
      // actor is null to permit public access to published listings
      payswarm.hosted.listing.getListings(
        null, query, {listing: true}, opts, callback);
    },
    function(records, callback) {
      var listings = [];
      records.forEach(function(record) {
        var listing = record.listing;
        if(excludeAsset) {
          listing.asset = listing.asset.id;
        }
        listings.push(listing);
      });
      res.json(listings);
    }
  ], function(err) {
    if(err) {
      next(err);
    }
  });
}

/**
 * Parses a date string into a date. If the date string can be parsed as
 * an integer, then it will
 *
 * @param str the date string.
 *
 * @return the Date or null on parse error.
 */
function _parseDate(str) {
  var rval = null;
  if(isFinite(str)) {
    // assume number is in seconds
    rval = new Date(1000 * parseInt(str));
  }
  else {
    rval = new Date(str);
  }
  // invalid date
  if(isNaN(+rval)) {
    rval = null;
  }
  return rval;
}
