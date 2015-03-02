/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */

/*
 * WARNING: Do not let this run in production mode until authorization added.
 */

var bedrock = require('bedrock');
var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var brValidation = require('bedrock-validation');
var brViews = require('bedrock-views');
var payswarm = {
  logger: bedrock.loggers.get('app')
};

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.system';
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

  app.get('/system/ping',
    function(req, res) {
      res.send('pong');
    });

  app.get('/system/dashboard', ensureAuthenticated,
    //validate({query: 'services.budget.getBudgetQuery'}),
    function(req, res, next) {
      // FIXME!!!
      /*
      if(req.user.identity !== authority) {
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
          brViews.getDefaultViewVars(req, function(err, vars) {
            if(err) {
              return next(err);
            }
            //vars.xxx = ...;
            res.render('system/dashboard.html', vars);
          });
        }
      });
    });

  callback(null);
}
