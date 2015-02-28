/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  db: require('bedrock-mongodb'),
  financial: require('./financial'),
  identity: require('bedrock-identity'),
  logger: bedrock.loggers.get('app'),
  tools: require('./tools'),
  validation: require('bedrock-validation')
};
var BedrockError = payswarm.tools.BedrockError;
var validate = payswarm.validation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.payswarm.identifier';
api.namespace = MODULE_NS;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  addServices(app, callback);
};

// FIXME: copied from bedrock, try to reuse as common lookup code?
/**
 * Common identifier lookup code.
 *
 * @param options object with checking options:
 *          lookup: function to use to lookup identifier
 *          id: id to check (optional)
 *          query: query options (optional, default: {id: hash(id)})
 * @param callback callback(err) called when done with possible error.
 */
function _check(options, callback) {
  // check for ID existence
  var query = options.query || {id: payswarm.db.hash(options.id)};
  options.lookup(null, query, {_id: true}, {limit: 1}, function(err, exists) {
    if(err) {
      return callback(err);
    }
    if(exists.length !== 0) {
      // ID is not available
      return callback(new BedrockError(
        'The chosen identifier is already in use.',
        MODULE_NS + '.DuplicateId', {
          httpStatusCode: 409,
          'public': true
        }));
    }
    callback();
  });
}

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  app.server.post('/identifier/financial-account',
    validate('services.payswarm.identifier.postFinancialAccountIdentifier'),
    function(req, res, next) {
      _check({
        lookup: payswarm.financial.getAccounts,
        id: payswarm.financial.createAccountId(
          req.body.owner, req.body.sysSlug)
      }, function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
  });

  callback(null);
}
