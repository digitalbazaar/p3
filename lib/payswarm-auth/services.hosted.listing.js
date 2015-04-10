/*
 * Copyright (c) 2013-2014 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var brValidation = require('bedrock-validation');
var brViews = require('bedrock-views');
var payswarm = {
  constants: bedrock.config.constants,
  hosted: {
    asset: require('./hosted.asset'),
    listing: require('./hosted.listing')
  },
  logger: bedrock.loggers.get('app'),
  security: require('./security'),
  tools: require('./tools')
};
var BedrockError = bedrock.util.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.hosted.listing';
api.namespace = MODULE_NS;
module.exports = api;

// add services
bedrock.events.on('bedrock-express.configure.routes', addServices);

/**
 * Adds web services to the server.
 *
 * @param app the bedrock application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = brPassport.ensureAuthenticated;
  var getDefaultViewVars = brViews.getDefaultViewVars;

  // create new hosted listing
  app.post('/i/:identity/listings',
    ensureAuthenticated,
    validate('services.hosted.listing.postListings'),
    function(req, res, next) {
      // get ID from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);

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
            req.user.identity, listing, callback);
        }
      ], function(err, record) {
        if(err) {
          err = new BedrockError(
            'The Listing could not be added.',
            MODULE_NS + '.AddListingFailed', {'public': true}, err);
          return next(err);
        }
        // return listing
        res.set('Location', record.listing.id);
        res.status(201).json(record.listing);
      });
    });

  // update existing hosted listing
  app.post('/i/:identity/listings/:listing',
    ensureAuthenticated,
    validate('services.hosted.listing.postListing'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var listingId = payswarm.hosted.listing.createListingId(
        identityId, req.params.listing);

      async.waterfall([
        function(callback) {
          // update listing
          var listing = req.body;
          listing.id = listingId;
          payswarm.hosted.listing.updateListing(
            req.user.identity, listing, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.status(204).end();
      });
    });

  // get hosted listing
  app.get('/i/:identity/listings/:listing',
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
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
              brIdentity.getIdentity(
                null, identityId, function(err, identity, identityMeta) {
                  if(err) {
                    return next(err);
                  }

                  // FIXME: this should be in the DB already
                  identity['@context'] =
                    payswarm.constants.PAYSWARM_CONTEXT_V1_URL;

                  // determine if requestor is the owner of the identity
                  var isOwner = req.isAuthenticated() &&
                    identity.owner === req.user.identity.id;
                  if(!isOwner) {
                    // only include public info
                    var publicIdentity = {
                      '@context': payswarm.constants.PAYSWARM_CONTEXT_V1_URL,
                      id: identity.id,
                      type: identity.type
                    };
                    identity.sysPublic.forEach(function(field) {
                      publicIdentity[field] = identity[field];
                    });
                    identity = publicIdentity;
                  }

                  getDefaultViewVars(req, function(err, vars) {
                    if(err) {
                      return next(err);
                    }
                    vars._private.listing = listing;
                    vars._private.identity = identity;
                    vars._private.identityMeta = identityMeta;
                    vars.listingId = listingId;
                    res.render('listing.html', vars);
                  });
                });
            },
            'default': function() {
              res.status(406).end();
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
  app.get('/i/:identity/listings',
    validate({query: 'services.hosted.listing.getListingsQuery'}),
    _getListings);

  // process a receipt
  app.post('/i/:identity/receipts',
    validate('services.hosted.listing.postReceipt'),
    function(req, res, next) {
      // get ID from URL, receipt from body
      var identityId = brIdentity.createIdentityId(req.params.identity);

      // JSON parse receipt
      try {
        var receipt = JSON.parse(req.body.receipt);
      } catch(ex) {
        return callback(new BedrockError(
          'Could not process Receipt; malformed JSON.',
          MODULE_NS + '.MalformedJSON',
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
          brIdentity.getIdentityPublicKey(
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
          if(publicKey.owner !== bedrock.config.authority.id) {
            return callback(new BedrockError(
              'Could not process Receipt; it was not signed by a trusted ' +
              'PaySwarm Authority.',
              MODULE_NS + '.InvalidReceiptSigner',
              {'public': true, httpStatusCode: 400}));
          }

          // ensure vendor ID matches identity ID
          if(receipt.contract.vendor !== identityId) {
            return callback(new BedrockError(
              'Could not process Receipt for the given Vendor; the Vendor ' +
              'ID does not match the value in the Receipt.',
              {'public': true, httpStatusCode: 400}));
          }

          // verify signature
          payswarm.security.verifyJsonLd(receipt, publicKey, callback);
        },
        function(verified, callback) {
          if(!verified) {
            return callback(new BedrockError(
              'Could not process Receipt; its digital signature could not be ' +
              'verified.', MODULE_NS + '.InvalidReceiptSignature'));
          }
          // get hosted asset
          var assetId = receipt.contract.asset;
          if(typeof assetId === 'object') {
            assetId = assetId.id;
          }
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
          err = new BedrockError(
            'The Receipt could not be processed.',
            MODULE_NS + '.ProcessReceiptFailed', {'public': true}, err);
          return next(err);
        }

        getDefaultViewVars(req, function(err, vars) {
          if(err) {
            return next(err);
          }

          // display page that can redirect user to see purchased content
          vars.encryptedReceipt = encryptedReceipt;
          vars.asset = asset;
          res.render('content-portal.html', vars);
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
  var identityId = brIdentity.createIdentityId(req.params.identity);

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
  query.vendor = brDatabase.hash(identityId);
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
    query.asset = brDatabase.hash(req.query.asset);
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
        opts.min.id = brDatabase.hash(options.previous);
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
  } else {
    rval = new Date(str);
  }
  // invalid date
  if(isNaN(+rval)) {
    rval = null;
  }
  return rval;
}
