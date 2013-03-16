/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  hosted: {
    asset: require('./hosted.asset')
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
  // create new hosted asset
  app.server.post('/i/:identity/assets',
    ensureAuthenticated,
    validate('services.hosted.asset.postAsset'),
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      async.waterfall([
        function(callback) {
          // generate asset ID
          payswarm.hosted.asset.generateAssetId(identityId, callback);
        },
        function(assetId, callback) {
          var asset = req.body;
          asset.id = assetId;
          asset.assetProvider = identityId;
          payswarm.hosted.asset.createAsset(
            req.user.profile, asset, callback);
        }
      ], function(err, record) {
        if(err) {
          err = new PaySwarmError(
            'The Asset could not be added.',
            MODULE_TYPE + '.AddAssetFailed', {'public': true}, err);
          return next(err);
        }
        // return asset
        res.set('Location', record.asset.id);
        res.json(201, record.asset);
      });
    });

  // update existing hosted asset
  app.server.post('/i/:identity/assets/:asset',
    ensureAuthenticated,
    validate('services.hosted.asset.postAsset'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var assetId = payswarm.hosted.asset.createAssetId(
        identityId, req.params.asset);

      async.waterfall([
        function(callback) {
          // update asset
          var asset = req.body;
          asset.id = assetId;
          payswarm.hosted.asset.updateAsset(
            req.user.profile, asset, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
    });

  // get hosted asset
  app.server.get('/i/:identity/assets/:asset',
    ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var assetId = payswarm.asset.createId(identityId, req.params.asset);

      async.waterfall([
        function(callback) {
          payswarm.hostedAsset.getAsset(req.user.profile. assetId, callback);
        },
        function(asset, meta, callback) {
          function ldjson() {
            res.json(asset);
          }
          res.format({
            'application/ld+json': ldjson,
            json: ldjson,
            html: function() {
              payswarm.identity.getIdentity(
                req.user.profile, identityId, function(err, identity) {
                  if(err) {
                    return next(err);
                  }
                  payswarm.website.getDefaultViewVars(req, function(err, vars) {
                    if(err) {
                      return next(err);
                    }
                    vars.asset = asset;
                    vars.identity = identity;
                    vars.clientData.assetId = assetId;
                    res.render('asset.tpl', vars);
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

  callback(null);
}
