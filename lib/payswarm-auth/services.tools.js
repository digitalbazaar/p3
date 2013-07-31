/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  asset: require('./resource'),
  config: require('../config'),
  db: require('./database'),
  docs: require('./docs'),
  events: require('./events'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  profile: require('./profile'),
  resource: require('./resource'),
  security: require('./security'),
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
  // common handler for all tools URLs
  // displayed content handled client side
  function _toolsHandler(req, res, next) {
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }

      // get identity based on URL
      var id = payswarm.identity.createIdentityId(req.params.identity);
      payswarm.identity.getIdentity(
        req.user.profile, id, function(err, identity) {
          if(err) {
            return next(err);
          }
          vars.identity = identity;
          vars.clientData.keygenOptions = {bitSize: 2048};
          vars.clientData.authority = payswarm.config.authority.id;
          vars.clientData.identity = identity;
          res.render('assetora.tpl', vars);
        });
    });
  }

  // get tools ui
  app.server.get('/i/:identity/tools', ensureAuthenticated, _toolsHandler);
  // FIXME: change name
  app.server.get('/i/:identity/assetora', ensureAuthenticated, _toolsHandler);
  app.server.get('/i/:identity/bills', ensureAuthenticated, _toolsHandler);
  app.server.get('/i/:identity/causes', ensureAuthenticated, _toolsHandler);
  app.server.get('/i/:identity/tickets', ensureAuthenticated, _toolsHandler);


  callback(null);
}
