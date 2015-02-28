/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  docs: require('bedrock-docs'),
  authority: require('./authority'),
  tools: require('./tools')
};
var BedrockError = payswarm.tools.BedrockError;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.well-known';
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

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  payswarm.docs.annotate.get(
    '/.well-known/payswarm', 'services.well-known.payswarm');
  app.server.get('/.well-known/payswarm', function(req, res, next) {
    // get authority key-pair
    payswarm.authority.getAuthorityKeyPair(null, function(err, publicKey) {
      if(err) {
        return callback(new BedrockError(
          'Could not retrieve PaySwarm Authority configuration.',
          'payswarm.config.Error', null, err));
      }

      // FIXME: check Accept for "application/ld+json; form=compacted" or other?
      var authority = payswarm.config.authority;
      var baseUri = authority.baseUri;
      var out = {
        '@context': payswarm.constants.CONTEXT_URL,
        // Authority IRI
        id: baseUri + '/',
        // Authority details
        authorityIdentity: authority.id,
        // API services
        contractService: baseUri + '/contracts',
        licenseService: baseUri + '/licenses',
        // Form services
        paymentService: baseUri + '/transactions?form=pay',
        vendorRegistrationService: baseUri + '/vendor/register',
        // public key for clients to use to encrypt data
        publicKey: publicKey.id
      };
      res.json(out);
    });
  });

  callback();
}
