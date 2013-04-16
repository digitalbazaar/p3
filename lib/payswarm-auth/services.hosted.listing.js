/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  hosted: {
    listing: require('./hosted.listing')
  },
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
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
    ensureAuthenticated,
    validate({query: 'services.hosted.listing.getListingsQuery'}),
    _getListings);

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

  async.waterfall([
    function(callback) {
      // use identity
      if(!req.user.identity) {
        // no listings
        return callback(null, []);
      }
      query.vendor = payswarm.db.hash(req.user.identity.id);

      // run query
      var opts = {sort: {created: -1, id: 1}, limit: options.limit};
      if(options.previous !== null) {
        opts.min = {};
        opts.min.vendor = query.vendor;
        opts.min['meta.created'] = +options.createdStart;
        opts.min.id = payswarm.db.hash(options.previous);
        opts.skip = 1;
      }
      payswarm.hosted.listing.getListings(
        req.user.profile, query, {listing: true}, opts, callback);
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
