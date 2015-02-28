/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  identity: require('bedrock-identity'),
  logger: bedrock.loggers.get('app'),
  passport: require('bedrock-passport'),
  views: require('bedrock-views')
};

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.assetora';
api.namespace = MODULE_NS;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  addServices(app, callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.passport.ensureAuthenticated;
  var getDefaultViewVars = payswarm.views.getDefaultViewVars;

  // get assetora ui
  app.server.get('/i/:identity/assetora',
    ensureAuthenticated,
    function(req, res, next) {
      getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }

        // get identity based on URL
        var id = payswarm.identity.createIdentityId(req.params.identity);
        payswarm.identity.getIdentity(
          req.user.identity, id, function(err, identity) {
            if(err) {
              return next(err);
            }
            vars.identity = identity;
            vars.clientData.keygenOptions = {bitSize: 2048};
            vars.clientData.authority = payswarm.config.authority.id;
            vars.clientData.identity = identity;
            res.render('assetora.html', vars);
          });
      });
    });

  callback(null);
}
