/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */

/*
WARNING: Do not let this run in production mode.
*/

var async = require('async');
var payswarm = {
  logger: require('./payswarm.loggers').get('app'),
  services: {
    profile: require('./payswarm.services.profile')
  },
  validation: require('./payswarm.validation'),
};
var validate = payswarm.validation.validate;

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
  app.server.get('/test/ping',
    function(req, res) {
      res.send("pong");
    });

  app.server.post('/test/profile/create',
    validate('services.profile.postCreate'),
    function(req, res, next) {
      var options = {
        account: {
          // lots of test money
          balance: '1000000'
        }
      };
      payswarm.services.profile._createProfile(req, res, next, options);
    });

  callback(null);
}
