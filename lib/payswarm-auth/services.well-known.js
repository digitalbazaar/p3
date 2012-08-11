/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  docs: require('./payswarm.docs')
};

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
  payswarm.docs.annotate.get(
    '/.well-known/web-keys', 'services.well-known.web-keys');
  app.server.get('/.well-known/web-keys', function(req, res) {
    var endpoints = {
      '@context': 'http://purl.org/payswarm/v1',
       publicKeyService: 'https://' + payswarm.config.server.host +
        '/i?form=register'
    };
    res.type('application/json');
    res.send(JSON.stringify(endpoints, null, 2));
  });

  payswarm.docs.annotate.get(
      '/.well-known/payswarm', 'services.well-known.payswarm');
  app.server.get('/.well-known/payswarm', function(req, res, next) {
    // FIXME: check Accept for "application/ld+json; form=compacted" or other?
    var authority = payswarm.config.authority;
    var baseUri = authority.baseUri;
    var out = {
      '@context': 'http://purl.org/payswarm/v1',
      // Authority IRI
      id: baseUri + '/',
      // Authority details
      authorityIdentity: authority.id,
      // FIXME: look up and specify the correct key
      publicKey: authority.id + '/keys/1',
      // API services
      contractService: baseUri + '/contracts',
      licenseService: baseUri + '/licenses',
      // Form services
      paymentService: baseUri + '/transactions?form=pay',
      vendorRegistrationService: baseUri + '/i?form=register'
    };
    res.json(out);
  });

  callback();
}
