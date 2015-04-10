/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var brDocs = require('bedrock-docs');
var payswarm = {
  constants: bedrock.config.constants,
  authority: require('./authority'),
  tools: require('./tools')
};
var BedrockError = bedrock.util.BedrockError;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.well-known';
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
  brDocs.annotate.get(
    '/.well-known/payswarm', 'services.well-known.payswarm');
  app.get('/.well-known/payswarm', function(req, res, next) {
    // get authority key-pair
    payswarm.authority.getAuthorityKeyPair(null, function(err, publicKey) {
      if(err) {
        return callback(new BedrockError(
          'Could not retrieve PaySwarm Authority configuration.',
          'payswarm.config.Error', null, err));
      }

      // FIXME: check Accept for "application/ld+json; form=compacted" or other?
      var authority = bedrock.config.authority;
      var baseUri = authority.baseUri;
      var out = {
        '@context': payswarm.constants.PAYSWARM_CONTEXT_V1_URL,
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
