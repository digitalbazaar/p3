/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;

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
  app.server.get('/i/:identity/addresses', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var id = payswarm.identity.createIdentityId(req.params.identity);
      payswarm.identity.getIdentity(
        req.user.profile, id, function(err, identity) {
          if(err) {
            return next(err);
          }
          // return addresses
          if('vcard:adr' in identity) {
            return res.json(identity['vcard:adr']);
          }
          next(new PaySwarmError(
            'The identity has no addresses.',
            MODULE_TYPE + '.AddressNotFound', {
              httpStatusCode: 404,
              'public': true
            }));
        });
  });

  callback(null);
}
