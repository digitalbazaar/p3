/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var brValidation = require('bedrock-validation');
var brViews = require('bedrock-views');
var payswarm = {
  constants: bedrock.config.constants,
  financial: require('./financial'),
  logger: bedrock.loggers.get('app'),
  tools: require('./tools')
};
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.vendor';
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
  var getDefaultViewVars = brViews.getDefaultViewVars;

  // Handles a request to get a public key registration form.
  app.get('/vendor/register',
    ensureAuthenticated,
    validate({query: 'services.vendor.getRegisterQuery'}),
    function(req, res, next) {
      async.waterfall([
        function(callback) {
          getDefaultViewVars(req, callback);
        },
        function(vars, callback) {
          vars.publicKey = {};
          // add query vars
          vars.publicKey.label =
            req.query['public-key-label'] || 'Access Key';
          if(req.query['public-key']) {
            vars.publicKey.publicKeyPem = req.query['public-key'];
          }
          if(req.query['registration-callback']) {
            vars.registrationCallback =
              req.query['registration-callback'];
          }
          if(req.query['response-nonce']) {
            vars.responseNonce = req.query['response-nonce'];
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
