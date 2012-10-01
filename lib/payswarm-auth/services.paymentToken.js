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
      var token = {
        '@context': payswarm.tools.getDefaultJsonLdContextUrl(),
        type: 'com:PaymentToken',
        label: req.body.label
      };
      async.waterfall([
        function(callback) {
          // get identity ID from URL
          var identityId =
            payswarm.identity.createIdentityId(req.params.identity);
          callback(null, identityId);
        },
        function(identityId, callback) {
          token.owner = identityId;

          // create paymentToken ID
          payswarm.financial.generatePaymentTokenId(identityId, callback);
        },
        function(paymentTokenId, callback) {
          token.id = paymentTokenId;

          // create paymentToken
          payswarm.financial.createPaymentToken(
            req.user.profile, {
              source: req.body.source,
              gateway: req.body.paymentGateway,
              token: token
            }, callback);
        },
        function(record, callback) {
          // FIXME: correct check?
          var err = null;
          if(record === null) {
            err = new PaySwarmError(
              'The payment gateway does not support storing payment methods.',
              MODULE_TYPE + '.PaymentTokensNotSupported',
              {'public': true,});
          }
          callback(err, record);
        }
      ], function(err, record) {
        if(err) {
          return next(new PaySwarmError(
            'The payment token could not be added.',
            MODULE_TYPE + '.AddPaymentTokenFailed', {
              'public': true,
            }, err));
        }
        // return payment token
        res.set('Location', record.paymentToken.id);
        res.json(201, record.paymentToken);
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
    validate('services.paymentToken.postPaymentToken'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var tokenId = payswarm.financial.createPaymentTokenId(
        identityId, req.params.paymentToken);

      // restore payment token
      if(req.query.action === 'restore') {
        return payswarm.financial.restorePaymentToken(
          req.user.profile, tokenId, function(err, record) {
            if(err) {
              return next(new PaySwarmError(
                'The payment token could not be restored.',
                MODULE_TYPE + '.RestorePaymentTokenFailed', {
                  'public': true,
                }, err));
            }
            res.send(200, record.paymentToken);
          });
      }

      if(req.query.action !== 'verify') {
        // verify payment token
        return payswarm.financial.verifyPaymentToken(
          req.user.profile, tokenId, {amounts: req.body.amounts},
          function(err, record) {
            if(err) {
              return next(new PaySwarmError(
                'The payment token could not be verified.',
                MODULE_TYPE + '.VerifyPaymentTokenFailed', {
                  'public': true,
                }, err));
            }
            res.send(204);
          });
      }

      // no other supported actions
      next();
  });

  app.server.del('/i/:identity/payment-tokens/:paymentToken',
    ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var paymentTokenId = payswarm.financial.createPaymentTokenId(
        identityId, req.params.paymentToken);

      // remove payment token
      payswarm.financial.removePaymentToken(
        req.user.profile, paymentTokenId, function(err, record) {
          if(err) {
            return next(err);
          }
          if(record) {
            return res.send(200, record.paymentToken);
          }
          res.send(204);
        });
  });

  callback(null);
}
