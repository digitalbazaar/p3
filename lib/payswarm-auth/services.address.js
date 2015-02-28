/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  db: require('bedrock-mongodb'),
  identity: require('bedrock-identity'),
  identityAddress: require('./identityAddress'),
  logger: bedrock.loggers.get('app'),
  passport: require('bedrock-passport'),
  tools: require('./tools'),
  validation: require('bedrock-validation')
};
var BedrockError = payswarm.tools.BedrockError;
var validate = payswarm.validation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.address';
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
  var ensureAuthenticated = payswarm.passport.ensureAuthenticated;

  app.server.get('/i/:identity/addresses', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      payswarm.identityAddress.getIdentityAddresses(req.user.identity, identityId, function(err, addresses) {
        if(err) {
          return next(err);
        }
        res.json(addresses);
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

  app.server.get('/i/:identity/addresses/:address', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var addressId = payswarm.identityAddress.createAddressId(
        identityId, req.params.address);

      payswarm.identityAddress.getIdentityAddress(req.user.identity, addressId, function(err, address) {
        if(err) {
          return next(err);
        }
        res.json(address);
      });
    });

  app.server.post('/i/:identity/addresses/:address', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var addressId = payswarm.identityAddress.createAddressId(
        identityId, req.params.address);

      // setup and validate changes
      var changes = payswarm.tools.clone(req.body);
      if(changes.id !== addressId) {
        return next(new BedrockError(
          'Resource and content id mismatch.',
          MODULE_NS + '.IdMismatch', {
            httpStatusCode: 400,
            'public': true
          }));
      }

      // update identity address
      payswarm.identityAddress.updateIdentityAddress(
        req.user.identity, changes, function(err) {
          if(err) {
            return next(err);
          }
          res.send(204);
        });
    });

  app.server.del('/i/:identity/addresses/:address', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var addressId = payswarm.identityAddress.createAddressId(
        identityId, req.params.address);

      // remove identity address
      payswarm.identityAddress.removeIdentityAddress(
        req.user.identity, identityId, addressId, function(err) {
          if(err) {
            return next(err);
          }
          res.send(204);
        });
    });

  callback(null);
}

function _validateAddress(req, res, next) {
  var address = req.body;
  payswarm.identityAddress.validateAddress(
    req.user.identity, address, function(err, validatedAddress) {
      if(err) {
        return next(err);
      }
      res.json(validatedAddress);
    });
}

function _postAddress(req, res, next) {
  // get identity ID from URL
  var identityId = payswarm.identity.createIdentityId(req.params.identity);

  var address = req.body;
  async.waterfall([
    function(callback) {
      // check address validation
      payswarm.identityAddress.isAddressValidated(
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
      // create address ID
      address.owner = identityId;
      payswarm.identityAddress.generateAddressId(identityId, callback);
    },
    function(addressId, callback) {
      address.id = addressId;

      // add identity address
      payswarm.identityAddress.addIdentityAddress(
        req.user.identity, identityId, address, callback);
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
