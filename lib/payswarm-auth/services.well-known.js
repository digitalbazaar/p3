/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  docs: require('./docs'),
  identity: bedrock.modules['bedrock.identity'],
  tools: require('./tools')
};
var BedrockError = payswarm.tools.BedrockError;

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
  payswarm.docs.annotate.get(
    '/.well-known/web-keys', 'services.well-known.web-keys');
  app.server.get('/.well-known/web-keys', function(req, res) {
    var endpoints = {
      '@context': 'https://w3id.org/payswarm/v1',
       publicKeyService: 'https://' + payswarm.config.server.host +
        '/i?form=register'
    };
    res.type('application/json');
    res.send(JSON.stringify(endpoints, null, 2));
  });

  payswarm.docs.annotate.get(
    '/.well-known/payswarm', 'services.well-known.payswarm');
  app.server.get('/.well-known/payswarm', function(req, res, next) {
    // get authority key-pair
    payswarm.identity.getAuthorityKeyPair(null, function(err, publicKey) {
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
        vendorRegistrationService: baseUri + '/i?form=register',
        // public key for clients to use to encrypt data
        publicKey: publicKey.id
      };
      res.json(out);
    });
  });

  callback();
}
