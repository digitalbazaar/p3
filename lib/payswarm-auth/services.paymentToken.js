/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
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
  app.server.post('/i/:identity/payment-tokens',
    ensureAuthenticated,
    validate('services.paymentToken.postPaymentTokens'),
    function(req, res, next) {
      // get identity ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      // create payment token
      var token = {
        type: 'com:PaymentToken',
        owner: identityId,
        label: req.body.label
      };
      payswarm.financial.createPaymentToken(
        req.user.profile, {
          source: req.body.source,
          gateway: req.body.paymentGateway,
          token: token
        }, function(err, token) {
          if(err) {
            return next(new PaySwarmError(
              'The PaymentToken could not be added.',
              MODULE_TYPE + '.AddPaymentTokenFailed', {
                'public': true,
              }, err));
          }
          if(token === null) {
            return next(new PaySwarmError(
              'The payment gateway does not support storing payment methods.',
              MODULE_TYPE + '.PaymentTokensNotSupported',
              {'public': true,}));
          }
          // return token
          res.set('Location', token.id);
          res.json(201, token);
        });
  });

  app.server.get('/i/:identity/payment-tokens', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      // get gateway
      var gateway = req.query.gateway || null;

      // get payment tokens
      payswarm.financial.getIdentityPaymentTokens(
        req.user.profile, identityId, gateway, function(err, records) {
          if(err) {
            return next(err);
          }
          var tokens = [];
          records.forEach(function(record) {
            tokens.push(record.paymentToken);
          });
          res.json(tokens);
        });
  });

  app.server.post('/i/:identity/payment-tokens/:paymentToken',
    ensureAuthenticated,
    validate('services.paymentToken.postVerify'),
    function(req, res, next) {
      if(req.query.action !== 'verify') {
        return next();
      }

      // get ID from URL
      var tokenId = payswarm.financial.createPaymentTokenId(
        req.params.paymentToken);
      payswarm.financial.verifyPaymentToken(
        req.user.profile, tokenId, req.body.amounts, function(err) {
          if(err) {
            return next(new PaySwarmError(
              'The PaymentToken could not be verified.',
              MODULE_TYPE + '.VerifyPaymentTokenFailed', {
                'public': true,
              }, err));
          }
          res.send(204);
        });
  });

  callback(null);
}
