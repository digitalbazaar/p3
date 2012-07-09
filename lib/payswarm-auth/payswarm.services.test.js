/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */

/*
WARNING: Do not let this run in production mode.
*/

var async = require('async');
var payswarm = {
  logger: require('./payswarm.loggers').get('app'),
  identity: require('./payswarm.identity'),
  services: {
    profile: require('./payswarm.services.profile')
  },
  validation: require('./payswarm.validation'),
};
var validate = payswarm.validation.validate;

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
  app.server.get('/test/ping',
    function(req, res) {
      res.send('pong');
    });

  app.server.post('/test/profile/create',
    validate('services.profile.postCreate'),
    function(req, res, next) {
      var options = {
        account: {
          // default to lots of test money
          balance: req.param('balance', '1000000')
        }
      };
      async.waterfall([
        function(callback) {
          payswarm.services.profile._createProfile(options, req, callback);
        },
        function(details, callback) {
          // skip if no key
          if(!('psaPublicKeyPem' in req.body)) {
            return callback(null, details);
          }

          // build public key
          var key = {
            owner: details.identity.id,
            label: 'key 1',
            publicKeyPem: req.body.psaPublicKeyPem
          };

          // add public key
          payswarm.identity.addIdentityPublicKey(
            details.profile, key, function(err) {
              if(err) {
                return next(new PaySwarmError(
                  'The public key could not be added.',
                  MODULE_TYPE + '.AddPublicKeyFailed', {
                    'public': true
                  }, err));
              }
              // pass on key
              details.psaPublicKey = key;
              callback(null, details);
            });
        },
        function(details, callback) {
          res.json(201, details);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
      });
    });

  callback(null);
}
