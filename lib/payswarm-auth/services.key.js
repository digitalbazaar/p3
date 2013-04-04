/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  profile: require('./profile'),
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
  app.server.post('/i/:identity/keys',
    ensureAuthenticated,
    validate('services.key.postKeys'),
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      // build public key
      var key = {
        '@context': payswarm.tools.getDefaultJsonLdContextUrl(),
        owner: identityId,
        label: req.body.label,
        publicKeyPem: req.body.publicKeyPem
      };

      // add public key
      payswarm.identity.addIdentityPublicKey(
        req.user.profile, key, function(err) {
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

  app.server.get('/i/:identity/keys',
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      async.waterfall([
        function(callback) {
          // get keys
          payswarm.identity.getIdentityPublicKeys(
            identityId, function(err, records) {
              if(err) {
                return callback(err);
              }
              var keys = [];
              records.forEach(function(record) {
                keys.push(record.publicKey);
              });
              res.json(keys);
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

      if('revoked' in req.body) {
        // revoke public key
        return payswarm.identity.revokeIdentityPublicKey(
          req.user.profile, publicKeyId, function(err, key) {
            if(err) {
              return next(err);
            }
            res.send(200, key);
          });
      }

      async.waterfall([
        function(callback) {
          // get public key
          payswarm.identity.getIdentityPublicKey(
            {id: publicKeyId}, callback);
        },
        function(key, callback) {
          // update public key
          if('label' in req.body) {
            key.label = req.body.label;
          }
          payswarm.identity.updateIdentityPublicKey(
            req.user.profile, key, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
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
          if(err.name === 'payswarm.identity.PublicKeyNotFound') {
            return next();
          }
          return next(err);
        }

        // FIXME: this should be in the DB already
        key['@context'] = payswarm.tools.getDefaultJsonLdContextUrl();

        var jsonLdOutput = function() {
          res.json(key);
        };
        res.format({
          'application/ld+json': jsonLdOutput,
          json: jsonLdOutput,
          html: function() {
            payswarm.website.getDefaultViewVars(req, function(err, vars) {
              if(err) {
                return next(err);
              }
              vars.key = key;
              vars.clientData.key = key;
              res.render('key.tpl', vars);
            });
          },
          'default': function() {
            res.send(406);
          }
        });
      });
  });

  callback(null);
}
