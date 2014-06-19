/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  db: bedrock.modules['bedrock.database'],
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  tools: require('./tools'),
  validation: bedrock.validation
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
  var ensureAuthenticated = payswarm.website.ensureAuthenticated;

  app.server.get('/i/:identity/addresses', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var id = payswarm.identity.createIdentityId(req.params.identity);
      payswarm.identity.getIdentity(
        req.user.identity, id, function(err, identity) {
          if(err) {
            return next(err);
          }
          // return addresses
          if('address' in identity) {
            return res.json(identity.address);
          }
          next(new BedrockError(
            'The identity has no addresses.',
            MODULE_NS + '.AddressNotFound', {
              httpStatusCode: 404,
              'public': true
            }));
        });
  });

  app.server.post('/i/:identity/addresses', ensureAuthenticated,
    validate({query: 'services.address.postAddressesQuery'}),
    function(req, res, next) {
      // only validate address if requested
      if(req.query.action === 'validate') {
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

  app.server.del('/i/:identity/addresses', ensureAuthenticated,
    validate({query: 'services.address.delAddressesQuery'}),
    function(req, res, next) {
      _removeAddress(req, res, next);
    });

  callback(null);
}

function _validateAddress(req, res, next) {
  var address = req.body;
  payswarm.identity.validateAddress(
    req.user.identity, address, function(err, validatedAddress) {
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
        req.user.identity, address, callback);
    },
    function(validated, callback) {
      if(!validated) {
        address.sysValidated = false;
        delete address.sysAddressHash;
      }
      // remove any context on address
      delete address['@context'];
      callback();
    },
    function(callback) {
      // add identity address
      payswarm.identity.addIdentityAddress(
        req.user.identity, id, address, callback);
    }
  ], function(err) {
    if(err) {
      err = new BedrockError(
        'The address could not be added.',
        MODULE_NS + '.AddAddressFailed', {
          'public': true
        }, err);
      return next(err);
    }
    // return address
    res.json(address);
  });
}

function _removeAddress(req, res, next) {
  // get identity ID from URL
  var id = payswarm.identity.createIdentityId(req.params.identity);

  async.waterfall([
    function(callback) {
      // remove identity address
      payswarm.identity.removeIdentityAddress(
        req.user.identity, id, req.query.addressId, callback);
    }
  ], function(err) {
    if(err) {
      err = new BedrockError(
        'The address could not be removed.',
        MODULE_NS + '.DeleteAddressFailed', {
          'public': true
        }, err);
      return next(err);
    }
    res.send(204);
  });
}
