/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  logger: bedrock.loggers.get('app'),
  resource: require('./resource'),
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
  app.server.get('/licenses/:license', function(req, res, next) {
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return callback(err);
      }
      var license = req.params.license;
      res.render('licenses/' + license + '.tpl', vars);
    });
  });

  app.server.post('/licenses',
    ensureAuthenticated,
    validate('services.license.cacheLicense'),
    function(req, res, next) {
      // FIXME: rate limit particular profiles

      var query = {id: req.body.license};
      if('licenseHash' in req.body) {
        query.licenseHash = req.body.licenseHash;
      }
      query.type = 'License';
      query.strict = true;
      query.fetch = true;
      payswarm.resource.license.get(query, function(err, records) {
        if(err) {
          return next(err);
        }
        res.json(records[0].resource);
      });
  });

  callback(null);
}
