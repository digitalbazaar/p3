/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  db: bedrock.modules['bedrock.database'],
  financial: require('./financial'),
  identity: require('./identity'),
logger: bedrock.loggers.get('app'),
  profile: require('./profile'),
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
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
  app.server.post('/identifier',
    validate('services.identifier.postIdentifier'),
    function(req, res, next) {
      // get ID and lookup function based on posted type
      var id = null;
      var lookup = null;
      var query = null;
      var options = {limit: 1};
      switch(req.body.type) {
      case 'Profile':
        id = payswarm.profile.createProfileId(req.body.psaSlug);
        lookup = payswarm.profile.getProfiles;
        break;
      case 'PersonalIdentity':
      case 'VendorIdentity':
        id = payswarm.identity.createIdentityId(req.body.psaSlug);
        lookup = payswarm.identity.getIdentities;
        break;
      case 'FinancialAccount':
        id = payswarm.financial.createAccountId(
          req.body.owner, req.body.psaSlug);
        lookup = payswarm.financial.getAccounts;
        break;
      case 'email':
        lookup = payswarm.profile.getProfiles;
        query = {'profile.email': req.body.email};
        break;
      }

      async.waterfall([
        function(callback) {
          if(!lookup) {
            // return that ID is not available
            return callback(null, false);
          }

          // check for ID existence
          query = query || {id: payswarm.db.hash(id)};
          lookup(null, query, {_id: true}, options, function(err, exists) {
            if(err) {
              return next(err);
            }
            callback(null, exists.length === 0);
          });
        },
        function(available, callback) {
          if(available) {
            return res.send(204);
          }

          // ID is not available
          callback(new PaySwarmError(
            'The chosen identifier is already in use.',
            MODULE_TYPE + '.DuplicateId', {
              httpStatusCode: 409,
              'public': true
            }));
        }
      ], function(err) {
        next(err);
      });
  });

  callback(null);
}
