/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  logger: require('./payswarm.loggers').get('app'),
  profile: require('./payswarm.profile'),
  validation: require('./payswarm.validation'),
  website: require('./payswarm.website')
};

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
  app.server.get('/docs', function(req, res, next) {
    async.waterfall([
      function(callback) {
        payswarm.website.getDefaultViewVars(req, function(err, vars) {
          if(err) {
            return callback(err);
          }
          vars.endpoints = [{
            url: '/foo',
            description: 'The foo service enables you to create foos.'
          }];

          // FIXME: Get routes and format them for display

          res.render('docs/index.tpl', vars);
        });
      }
    ], function(err) {
      if(err) {
        return next(err);
      }
    });
  });

  callback();
}
