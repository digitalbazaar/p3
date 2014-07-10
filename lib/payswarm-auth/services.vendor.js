/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  db: bedrock.modules['bedrock.database'],
  financial: require('./financial'),
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  tools: require('./tools'),
  validation: bedrock.validation
};

var BedrockError = payswarm.tools.BedrockError;
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
  payswarm.website = bedrock.modules['bedrock.website'];
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

          /*
          // get all profile identities
          _getIdentity(req, function(err, identity, meta) {
            vars.identity = identity;
            callback(err, vars);
          });
          */
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

/**
 * Gets a Profile's Identities, including each Identity's FinancialAccounts
 * and PublicKeys.
 *
 * @param req the request with the Profile.
 * @param callback(err, identities) called once the operation completes.
 */
function _getIdentities(req, callback) {
  // get all profile identities
  payswarm.identity.getProfileIdentities(
    req.user.identity, req.user.identity.id, function(err, records) {
      if(err) {
        return callback(err);
      }
      var identities = [];
      records.forEach(function(record) {
        identities.push(record.identity);
      });
      // get accounts and public keys for each identity
      async.forEach(identities, function(identity, callback) {
        async.auto({
          getAccounts: function(callback) {
            payswarm.financial.getIdentityAccounts(
              req.user.identity, identity.id, callback);
          },
          getKeys: function(callback) {
            payswarm.identity.getIdentityPublicKeys(
              identity.id, callback);
          }
        }, function(err, result) {
          if(err) {
            return callback(err);
          }
          // add accounts and keys to identity
          identity.accounts = [];
          result.getAccounts.forEach(function(record) {
            var account = record.account;
            if(account.sysStatus !== 'deleted') {
              identity.accounts.push(account);
            }
          });
          identity.keys = [];
          result.getKeys.forEach(function(record) {
            var key = record.publicKey;
            if(key.sysStatus === 'active') {
              identity.keys.push(key);
            }
          });
          callback();
        });
      }, function(err) {
        callback(err, identities);
      });
    });
}
