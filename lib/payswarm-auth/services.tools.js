/*
 * Copyright (c) 2013-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  identity: require('bedrock-identity'),
  logger: bedrock.loggers.get('app'),
  passport: require('bedrock-passport'),
  validation: require('bedrock-validation'),
  views: require('bedrock-views')
};

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.tools';
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
  }

  // get tools ui
  app.get('/i/:identity/tools', ensureAuthenticated, _toolsHandler);
  // FIXME: change name
  app.get('/i/:identity/assetora', ensureAuthenticated, _toolsHandler);
  app.get('/i/:identity/invoices', ensureAuthenticated, _toolsHandler);
  app.get('/i/:identity/causes', ensureAuthenticated, _toolsHandler);
  app.get('/i/:identity/tickets', ensureAuthenticated, _toolsHandler);

  callback(null);
}
