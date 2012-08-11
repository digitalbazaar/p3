/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  profile: require('./payswarm.profile'),
  tools: require('./payswarm.tools'),
  validation: require('./payswarm.validation'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
var validate = payswarm.validation.validate;

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
  app.server.post('/i/:identity/keys',
    ensureAuthenticated,
    validate('services.key.postKeys'),
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      // build public key
      var key = {
        owner: identityId,
        label: req.body.label,
        publicKeyPem: req.body.publicKeyPem
      };

      // add public key
      payswarm.identity.addIdentityPublicKey(
        req.user.profile, key, function(err) {
          // FIXME: callback has record param
          if(err) {
            return next(new PaySwarmError(
              'The public key could not be added.',
              MODULE_TYPE + '.AddPublicKeyFailed', {
                'public': true
              }, err));
          }
          // return key
          res.set('Location', key.id);
          res.json(201, key);
        });
  });

  app.server.get('/i/:identity/keys', ensureAuthenticated,
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      async.waterfall([
        function(callback) {
          // get identity
          payswarm.identity.getIdentity(
            req.user.profile, identityId, callback);
        },
        function(identity, meta, callback) {
          // get keys
          payswarm.identity.getIdentityPublicKeys(
            identity.id, function(err, records) {
              if(err) {
                return callback(err);
              }
              var keys = [];
              records.forEach(function(record) {
                keys.push(record.publicKey);
              });
              callback(null, identity, keys);
            });
        },
        function(identity, keys, callback) {
          getDefaultViewVars(req, function(err, vars) {
            if(err) {
              return callback(err);
            }
            vars.profile = req.user.profile;
            vars.identity = identity;
            vars.keys = keys;
            res.render('keys/keys.tpl', vars);
          });
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
      });
  });

  app.server.post('/i/:identity/keys/:publicKey',
    ensureAuthenticated,
    validate('services.key.postKey'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var publicKeyId = payswarm.identity.createIdentityPublicKeyId(
        identityId, req.params.publicKey);

      async.waterfall([
        function(callback) {
          // get public key
          payswarm.identity.getIdentityPublicKey(
            {id: publicKeyId}, callback);
        },
        function(key, callback) {
          if('label' in req.body) {
            key.label = req.body.label;
          }
          if(req.body.psaStatus) {
            key.psaStatus = req.body.psaStatus;
          }
          // update public key
          payswarm.identity.updateIdentityPublicKey(
            req.user.profile, key, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send();
      });
  });

  app.server.get('/i/:identity/keys/:publicKey', function(req, res, next) {
    // get IDs from URL
    var identityId = payswarm.identity.createIdentityId(req.params.identity);
    var publicKeyId = payswarm.identity.createIdentityPublicKeyId(
      identityId, req.params.publicKey);

    // get public key
    payswarm.identity.getIdentityPublicKey(
      {id: publicKeyId}, function(err, key) {
        if(err) {
          return next(err);
        }
        delete key.psaStatus;
        res.json(key);
      });
  });

  callback(null);
}
