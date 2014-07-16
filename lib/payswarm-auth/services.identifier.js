/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.module('config'),
  db: bedrock.module('bedrock.database'),
  financial: require('./financial'),
  identity: bedrock.module('bedrock.identity'),
  logger: bedrock.module('loggers').get('app'),
  tools: require('./tools'),
  validation: bedrock.module('validation')
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
  app.server.post('/identifier',
    validate('services.identifier.postIdentifier'),
    function(req, res, next) {
      // get ID and lookup function based on posted type
      var id = null;
      var lookup = null;
      var query = null;
      var options = {limit: 1};
      switch(req.body.type) {
      case 'Identity':
        id = payswarm.identity.createIdentityId(req.body.sysSlug);
        lookup = payswarm.identity.getIdentities;
        break;
      case 'FinancialAccount':
        id = payswarm.financial.createAccountId(
          req.body.owner, req.body.sysSlug);
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
          callback(new BedrockError(
            'The chosen identifier is already in use.',
            MODULE_NS + '.DuplicateId', {
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
