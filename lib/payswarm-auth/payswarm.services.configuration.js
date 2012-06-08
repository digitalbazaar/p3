/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

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
  app.server.get('/payswarm-v1-config', function(req, res, next) {
    // FIXME: check Accept for "application/ld+json; form=compacted" or other?
    var authority = payswarm.config.authority;
    var baseUri = authority.baseUri;
    var out = {
      '@context': payswarm.tools.PAYSWARM_CONTEXT,
      // Authority IRI
      '@id': baseUri + '/',
      // Authority details
      'ps:authorityIdentity': authority.id,
      // FIXME: look up and specify the correct key
      'ps:publicKey': authority.id + '/keys/1',
      // API services
      'ps:contractsService': baseUri + '/contracts',
      'ps:licensesService': baseUri + '/licenses',
      'ps:publicKeyssService': '/keys',
      // Form services
      'ps:paymentService': baseUri + '/transactions?form=pay',
      'ps:vendorRegistrationService': baseUri + '/i?form=register'
    };
    res.json(out);
  });

  callback(null);
}
