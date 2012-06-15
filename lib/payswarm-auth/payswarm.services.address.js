/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  tools: require('./payswarm.tools'),
  validation: require('./payswarm.validation'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
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

  app.server.post('/i/:identity/addresses', ensureAuthenticated,
    function(req, res, next) {
      // only validate address if requested
      if(req.query.validate === 'true') {
        return validate('services.address.validateAddress')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _validateAddress(req, res, next);
          });
      }

      validate('services.address.postAddresses')(req, res, function(err) {
        if(err) {
          return next(err);
        }
        _postAddress(req, res, next);
      });
    });

  callback(null);
}

function _validateAddress(req, res, next) {
  var address = req.body;
  payswarm.identity.validateAddress(
    req.user.profile, address, function(err, validatedAddress) {
      if(err) {
        return next(err);
      }
      res.json(validatedAddress);
    });
}

function _postAddress(req, res, next) {
  // get identity ID from URL
  var id = payswarm.identity.createIdentityId(req.params.identity);

  var address = req.body;
  async.waterfall([
    function(callback) {
      // check address validation
      payswarm.identity.isAddressValidated(
        req.user.profile, address, callback);
    },
    function(validated, callback) {
      if(!validated) {
        address['psa:validated'] = false;
        delete address['psa:addressHash'];
      }
      // remove any context on address
      delete address['@context'];
      callback();
    },
    function(callback) {
      // add identity address
      payswarm.identity.addIdentityAddress(
        req.user.profile, id, address, callback);
    }
  ], function(err) {
    if(err) {
      err = new PaySwarmError(
        'The address could not be added.',
        MODULE_TYPE + '.AddAddressFailed', {
          'public': true
        }, err);
      return next(err);
    }
    // return address
    res.json(address);
  });
}
