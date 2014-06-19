/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  logger: bedrock.loggers.get('app'),
  resource: require('./resource'),
  validation: bedrock.validation
};
var validate = payswarm.validation.validate;

// constants
var MODULE_NS;

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
  payswarm.website = bedrock.modules['bedrock.website'];
  MODULE_NS = payswarm.website.namespace;
  addServices(app, callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.website.ensureAuthenticated;
  var getDefaultViewVars = payswarm.website.getDefaultViewVars;

  app.server.get('/licenses/:license', function(req, res, next) {
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return callback(err);
      }
      var license = req.params.license;
      res.render('licenses/' + license + '.html', vars);
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
