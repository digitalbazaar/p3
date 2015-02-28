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

// add services
bedrock.events.on('bedrock-express.configure.routes', addServices);

/**
 * Adds web services to the server.
 *
 * @param app the bedrock application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.passport.ensureAuthenticated;
  var getDefaultViewVars = payswarm.views.getDefaultViewVars;

  // get assetora ui
  app.get('/i/:identity/assetora',
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
            vars.keygenOptions = {bitSize: 2048};
            vars.authority = payswarm.config.authority.id;
            vars.identity = identity;
            res.render('assetora.html', vars);
          });
      });
    });

  callback(null);
}
