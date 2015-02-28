/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  db: require('bedrock-mongodb'),
  financial: require('./financial'),
  identity: require('bedrock-identity'),
  logger: bedrock.loggers.get('app'),
  passport: require('bedrock-passport'),
  tools: require('./tools'),
  validation: require('bedrock-validation'),
  views: require('bedrock-views')
};
var validate = payswarm.validation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.vendor';
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

  // Handles a request to get a public key registration form.
  app.server.get('/vendor/register',
    ensureAuthenticated,
    validate({query: 'services.vendor.getRegisterQuery'}),
    function(req, res, next) {
      async.waterfall([
        function(callback) {
          getDefaultViewVars(req, callback);
        },
        function(vars, callback) {
          vars.clientData.publicKey = {};
          // add query vars
          vars.clientData.publicKey.label =
            req.query['public-key-label'] || 'Access Key';
          if(req.query['public-key']) {
            vars.clientData.publicKey.publicKeyPem = req.query['public-key'];
          }
          if(req.query['registration-callback']) {
            vars.clientData.registrationCallback =
              req.query['registration-callback'];
          }
          if(req.query['response-nonce']) {
            vars.clientData.responseNonce = req.query['response-nonce'];
          }
          callback(null, vars);
        }
      ], function(err, vars) {
        if(err) {
          return next(err);
        }
        res.render('register-public-key.html', vars);
      });
    });

  callback(null);
}
