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
var jsonld = require('./jsonld');
var payswarm = {
  constants: bedrock.config.constants,
  hosted: {
    asset: require('./hosted.asset')
  },
  logger: bedrock.loggers.get('app'),
  tools: require('./tools')
};
var BedrockError = payswarm.tools.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.hosted.asset';
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

  // create new hosted asset
  app.post('/i/:identity/assets',
    ensureAuthenticated,
    // check konwn asset properties, extra allowed and checked in handler
    validate('services.hosted.asset.postAssets'),
    function(req, res, next) {
      // get ID from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);

      async.waterfall([
        // FIXME: fail on unknown types?
        function(callback) {
          // check asset as an invoice
          if(jsonld.hasValue(req.body, 'type', 'Invoice')) {
            validate('invoice', req.body, callback);
            return;
          }
          callback(null);
        },
        //function(callback) {
        //  // check asset as an invoice
        //  if(jsonld.hasValue(req.body, 'type', 'Cause')) {
        //    validate('cause', req.body, callback);
        //    return;
        //  }
        //  callback(null)
        //},
        //function(callback) {
        //  // check asset as an ticket
        //  if(jsonld.hasValue(req.body, 'type', 'Ticket')) {
        //    validate('ticket', req.body, callback);
        //    return;
        //  }
        //  callback(null)
        //},
        function(callback) {
          // generate asset ID
          payswarm.hosted.asset.generateAssetId(identityId, callback);
        },
        function(assetId, callback) {
          var asset = req.body;
          asset.id = assetId;
          asset.assetProvider = identityId;

          // if missing, make assetContent self-referrencing
          if(!('assetContent' in asset)) {
            asset.assetContent = asset.id;
          }

          payswarm.hosted.asset.createAsset(
            req.user.identity, asset, callback);
        }
      ], function(err, record) {
        if(err) {
          err = new BedrockError(
            'The Asset could not be added.',
            MODULE_NS + '.AddAssetFailed', {'public': true}, err);
          return next(err);
        }
        // return asset
        res.set('Location', record.asset.id);
        res.json(201, record.asset);
      });
    });

  // update existing hosted asset
  app.post('/i/:identity/assets/:asset',
    ensureAuthenticated,
    validate('services.hosted.asset.postAsset'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var assetId = payswarm.hosted.asset.createAssetId(
        identityId, req.params.asset);

      async.waterfall([
        function(callback) {
          // update asset
          var asset = req.body;
          asset.id = assetId;
          payswarm.hosted.asset.updateAsset(
            req.user.identity, asset, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
    });

  // update hosted asset public key
  app.post('/i/:identity/assets/:asset/key',
    ensureAuthenticated,
    validate('services.hosted.asset.postAssetPublicKey'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var assetId = payswarm.hosted.asset.createAssetId(
        identityId, req.params.asset);

      async.waterfall([
        function(callback) {
          payswarm.hosted.asset.setAssetContentPublicKey(
            req.user.identity, assetId, req.body, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
    });

  // get hosted asset
  app.get('/i/:identity/assets/:asset',
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var assetId = payswarm.hosted.asset.createAssetId(
        identityId, req.params.asset);

      async.waterfall([
        function(callback) {
          payswarm.hosted.asset.getAsset(null, assetId, callback);
        },
        function(asset, meta, callback) {
          function ldjson() {
            res.json(asset);
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

                  brViews.getDefaultViewVars(req, function(err, vars) {
                    if(err) {
                      return next(err);
                    }
                    vars._private.asset = asset;
                    vars._private.identity = identity;
                    vars._private.identityMeta = identityMeta;
                    vars.assetId = assetId;
                    res.render('asset.html', vars);
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

  // get hosted assets
  app.get('/i/:identity/assets',
    validate({query: 'services.hosted.asset.getAssetsQuery'}),
    _getAssets);

  callback(null);
}

/**
 * Handles a request to get Assets.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getAssets(req, res, next) {
  var identityId = brIdentity.createIdentityId(req.params.identity);

  res.format({
    'application/ld+json': ldjson,
    json: ldjson,
    html: function() {
      // display html immediately, it will do JS-based query for JSON results
      brViews.getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        vars.identityId = identityId;
        vars.query = req.query;
        // FIXME: get from another config var
        vars.purchaseUrl =
          bedrock.config.authority.baseUri + '/transactions?form=pay';
        res.render('hostedAssets.html', vars);
      });
    },
    'default': function() {
      res.send(406);
    }
  });

  function ldjson() {
    // create default query options
    var options = {
      type: req.query.type || null,
      createdStart: _parseDate(req.query.createdStart) || new Date(),
      createdEnd: _parseDate(req.query.createdEnd) || null,
      previous: req.query.previous || null,
      limit: Math.abs(Math.min(30, req.query.limit || 30))
      // FIXME: implement other query vars
    };

    // start building query
    var query = {};
    query.assetProvider = brDatabase.hash(identityId);
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
    if(req.query.assetContent) {
      query.assetContent = brDatabase.hash(req.query.assetContent);
    }

    // if request user does not match the identity, only show published assets
    if(!req.user || !req.user.identity || req.user.identity.id !== identityId) {
      query.published = {$lte: +new Date()};
    }

    async.waterfall([
      function(callback) {
        // run query
        var opts = {sort: {created: -1, id: 1}, limit: options.limit};
        if(options.previous !== null) {
          opts.min = {};
          opts.min.assetProvider = query.assetProvider;
          opts.min['meta.created'] = +options.createdStart;
          opts.min.id = brDatabase.hash(options.previous);
          opts.skip = 1;
        }
        // actor is null to permit public access to published assets
        payswarm.hosted.asset.getAssets(
          null, query, {asset: true}, opts, callback);
      },
      function(records, callback) {
        var assets = [];
        records.forEach(function(record) {
          var asset = record.asset;
          // FIXME: move this to the database query
          if(options.type) {
            if(jsonld.hasValue(asset, 'type', options.type)) {
              assets.push(asset);
            }
          } else {
            assets.push(asset);
          }
        });
        res.json(assets);
      }
    ], function(err) {
      if(err) {
        next(err);
      }
    });
  }
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
