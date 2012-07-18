/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
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
  app.server.get('/.well-known/web-keys', function(req, res) {
    var endpoints = {
      '@context': 'http://purl.org/payswarm/v1',
       publicKeyService: 'https://' + payswarm.config.server.host +
        '/i?form=register'
    };
    res.type('application/json');
    res.send(JSON.stringify(endpoints, null, 2));
  });

  callback();
}
