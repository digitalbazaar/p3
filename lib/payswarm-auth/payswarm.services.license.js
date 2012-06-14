/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  logger: require('./payswarm.loggers').get('app'),
  resource: require('./payswarm.resource'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
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

  app.server.post('/licenses', ensureAuthenticated, function(req, res, next) {
    // FIXME: rate limit particular profiles

    var query = {id: req.body['ps:license']};
    if('ps:licenseHash' in req.body) {
      query['ps:licenseHash'] = req.body['ps:licenseHash'];
    }
    query.type = 'ps:License';
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
