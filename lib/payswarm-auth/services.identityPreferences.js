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
  authority: require('./authority'),
  financial: require('./financial'),
  identityPreferences: require('./identityPreferences'),
  logger: bedrock.loggers.get('app'),
  tools: require('./tools')
};

var BedrockError = payswarm.tools.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.identityPreferences';
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

  var idPath = bedrock.config.identity.basePath + '/:identity';

  app.post('/i/:identity/preferences',
    ensureAuthenticated,
    validate('services.identityPreferences.postPreferences'),
    function(req, res, next) {
      // get ID from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);

      async.auto({
        getDestinationAccount: function(callback) {
          if(!req.body.destination) {
            return callback();
          }
          payswarm.financial.getAccount(
            req.user.identity, req.body.destination,
            function(err, account) {
              callback(err, account);
            });
        },
        getSourceAccount: function(callback) {
          if(!req.body.source) {
            return callback();
          }
          payswarm.financial.getAccount(
            req.user.identity, req.body.source,
            function(err, account) {
              callback(err, account);
            });
        },
        handleKey: function(callback) {
          if(!req.body.publicKey) {
            return callback();
          }
          // get existing key
          if(typeof req.body.publicKey === 'string') {
            return brIdentity.getIdentityPublicKey(
              {id: req.body.publicKey}, function(err, key) {
                if(err) {
                  return callback(err);
                }
                callback(null, key);
              });
          }
          // create new key
          var key = {};
          key.type = 'CryptographicKey';
          key.owner = identityId;
          key.label = req.body.publicKey.label;
          key.publicKeyPem = req.body.publicKey.publicKeyPem;
          brIdentity.addIdentityPublicKey(
            req.user.identity, key, function(err, record) {
              // if error was duplicate public key, populate key by PEM
              if(brDatabase.isDuplicateError(err)) {
                delete key.id;
                return brIdentity.getIdentityPublicKey(
                  key, function(err, key) {
                    callback(err, key);
                  });
              }
              if(err) {
                return callback(new BedrockError(
                  'The public key could not be added.',
                  MODULE_NS + '.AddPublicKeyFailed',
                  {'public': true}, err));
              }
              callback(null, record.publicKey);
            });
        },
        checkKey: ['handleKey', function(callback, results) {
          var key = results.handleKey;
          if(!key) {
            return callback(null, null);
          }
          if('revoked' in key) {
            return callback(new BedrockError(
              'The public key could not be added; it matches an existing ' +
              'key that has been revoked.',
              MODULE_NS + '.AddPublicKeyFailed',
              {'public': true}));
          } else if(key.sysStatus !== 'active') {
            return callback(new BedrockError(
              'The public key could not be added; it matches an existing ' +
              'key that is no longer active.',
              MODULE_NS + '.AddPublicKeyFailed',
              {'public': true}));
          }
          callback();
        }],
        setPreferences: [
          'getDestinationAccount', 'getSourceAccount', 'checkKey',
          function(callback, results) {
            var prefs = {};
            prefs.type = 'IdentityPreferences';
            prefs.owner = identityId;
            if(results.getDestinationAccount) {
              prefs.destination = results.getDestinationAccount.id;
            }
            if(results.getSourceAccount) {
              prefs.source = results.getSourceAccount.id;
            }
            if(results.handleKey) {
              prefs.publicKey = results.handleKey.id;
            }
            brIdentityPreferences.setIdentityPreferences(
              req.user.identity, prefs, callback);
        }]
      }, function(err, results) {
        if(err) {
          return next(new BedrockError(
            'The preferences for the given Identity could not be updated.',
            MODULE_NS + '.PreferencesUpdateFailed', {
              identity: identityId,
              'public': true
            }, err));
        }
        res.send(204);
      });
  });

  app.get('/i/:identity/preferences', ensureAuthenticated,
    function(req, res, next) {
      // get ID from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);

      async.waterfall([
        function(callback) {
          payswarm.identityPreferences.getIdentityPreferences(
            req.user.identity, {owner: identityId}, callback);
        },
        function(prefs, callback) {
          // send unencrypted preferences if no nonce is provided
          if(!('response-nonce' in req.query)) {
            return callback(null, prefs);
          }
          // send encrypt preferences
          payswarm.authority.encryptMessage(
            prefs, prefs.publicKey,
            req.query['response-nonce'], callback);
        }
      ], function(err, prefs) {
        if(err) {
          return next(err);
        }
        res.json(prefs);
      });
  });

  callback(null);
}
