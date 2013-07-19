/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */

/*
 * WARNING: Do not let this run in production mode until authorization added.
 */

var async = require('async');
var payswarm = {
  db: require('./database'),
  logger: require('./loggers').get('app'),
  identity: require('./identity'),
  services: {
    profile: require('./services.profile')
  },
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
};
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
var getDefaultViewVars = payswarm.website.getDefaultViewVars;
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
  app.server.get('/system/ping',
    function(req, res) {
      res.send('pong');
    });

  app.server.get('/system/dashboard', ensureAuthenticated,
    //validate({query: 'services.budget.getBudgetQuery'}),
    function(req, res, next) {
      // FIXME!!!
      /*
      if(req.user.profile !== authority) {
        return next(err);
      }
      */
      function ldjson() {
        res.json({});
      }
      res.format({
        'application/ld+json': ldjson,
        json: ldjson,
        html: function() {
          payswarm.website.getDefaultViewVars(req, function(err, vars) {
            if(err) {
              return next(err);
            }
            //vars.xxx = ...;
            //vars.clientData.xxx = ...;
            res.render('system/dashboard.tpl', vars);
          });
        }
      });
    });

  callback(null);
}
