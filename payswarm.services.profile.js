/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var passport = require('passport');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website'),
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;

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
 * Adds web services to this server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  app.server.post('/login', function(req, res, next) {
    passport.authenticate('payswarm.password', function(err, user, info) {
      if(!user) {
        err = new PaySwarmError(
          info.message, MODULE_TYPE + '.InvalidCredentials');
      }
      if(err) {
        return next(err);
      }

      if(user) {
        req.logIn(user, function(err) {
          if(err) {
            return next(err);
          }
          // FIXME: redirect to redirect param if exists
          return res.redirect('/');
        });
      }
    })(req, res, next);
  });

  callback(null);
}
