/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  profile: require('./payswarm.profile'),
  tools: require('./payswarm.tools'),
  validation: require('./payswarm.validation'),
  website: require('./payswarm.website')
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
      // FIXME: do IP-based or other limiting?

      // get ID and lookup function based on posted @type
      var id = null;
      var lookup = null;
      switch(req.body['@type']) {
      case 'ps:Profile':
        id = payswarm.profile.createProfileId(req.body['psa:slug']);
        lookup = payswarm.profile.getProfiles;
        break;
      case 'ps:PersonalIdentity':
      case 'ps:VendorIdentity':
        id = payswarm.identity.createIdentityId(req.body['psa:slug']);
        lookup = payswarm.identity.getIdentities;
        break;
      case 'ps:FinancialAccount':
        id = payswarm.financial.createAccountId(
          req.body['ps:owner'], req.body['psa:slug']);
        lookup = payswarm.financial.getAccounts;
        break;
      }

      async.waterfall([
        function(callback) {
          if(!lookup) {
            // return that ID is not available
            return callback(null, false);
          }

          // check for ID existence
          var query = {id: payswarm.db.hash(id)};
          lookup(null, query, {id: true}, function(err, exists) {
            if(err) {
              return next(err);
            }
            callback(null, exists.length === 0);
          });
        },
        function(available, callback) {
          if(available) {
            return res.send();
          }

          // ID is not available
          res.json(new PaySwarmError(
            'The chosen identifier is already in use.',
            MODULE_TYPE + '.DuplicateId', {
              httpStatusCode: 409,
              'public': true
            }).toObject(), 409);
        }
      ], function(err) {
        next(err);
      });
  });

  callback(null);
}
