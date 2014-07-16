/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.module('config'),
  constants: bedrock.module('config').constants,
  db: bedrock.module('bedrock.database'),
  financial: require('./financial'),
  identity: bedrock.module('bedrock.identity'),
  logger: bedrock.module('loggers').get('app'),
  tools: require('./tools'),
  validation: bedrock.module('validation')
};
var validate = payswarm.validation.validate;

// constants
var MODULE_NS;

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
  payswarm.website = bedrock.module('bedrock.website');
  MODULE_NS = payswarm.website.namespace;
  addServices(app, callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.website.ensureAuthenticated;
  var getDefaultViewVars = payswarm.website.getDefaultViewVars;

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
          if(req.query['public-key']) {
            vars.publicKeyPem = req.query['public-key'];
          }
          vars.clientData.publicKey.label =
            req.query['public-key-label'] || 'Access Key';
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
