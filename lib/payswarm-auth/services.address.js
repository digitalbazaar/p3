/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var brValidation = require('bedrock-validation');
var payswarm = {
  identityAddress: require('./identityAddress'),
  logger: bedrock.loggers.get('app'),
  tools: require('./tools')
};
var BedrockError = payswarm.tools.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.address';
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
  var ensureAuthenticated = brPassport.ensureAuthenticated;

  app.get('/i/:identity/addresses', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      payswarm.identityAddress.getIdentityAddresses(req.user.identity, identityId, function(err, addresses) {
        if(err) {
          return next(err);
        }
        res.json(addresses);
      });
  });

  app.post('/i/:identity/addresses', ensureAuthenticated,
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

  app.get('/i/:identity/addresses/:address', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var addressId = payswarm.identityAddress.createAddressId(
        identityId, req.params.address);

      payswarm.identityAddress.getIdentityAddress(req.user.identity, addressId, function(err, address) {
        if(err) {
          return next(err);
        }
        res.json(address);
      });
    });

  app.post('/i/:identity/addresses/:address', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
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

  app.delete('/i/:identity/addresses/:address', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
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
  var identityId = brIdentity.createIdentityId(req.params.identity);

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
