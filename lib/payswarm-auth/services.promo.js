/*
 * Copyright (c) 2013-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.module('config'),
  constants: bedrock.module('config').constants,
  logger: bedrock.module('loggers').get('app'),
  promo: require('./promo'),
  tools: require('./tools'),
  validation: bedrock.module('validation')
};
var BedrockError = payswarm.tools.BedrockError;
var validate = payswarm.validation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.promo';
api.namespace = MODULE_NS;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  payswarm.website = bedrock.module('bedrock.website');
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

  app.server.post('/promos',
    ensureAuthenticated,
    validate({query: 'services.promo.postPromosQuery'}),
    function(req, res, next) {
      if(req.query.action === 'redeem') {
        return validate('services.promo.redeemCode')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            payswarm.promo.redeemCode(req.user.identity, {
              promoCode: req.body.promoCode,
              account: req.body.account
            }, function(err, promo) {
              if(err) {
                var httpStatusCode = 500;
                if(err.details && err.details.httpStatusCode) {
                  httpStatusCode = err.details.httpStatusCode;
                }
                err = new BedrockError(
                  'The promotional code could not be redeemed.',
                  MODULE_NS + '.PromoCodeNotRedeemed', {
                    'public': true, httpStatusCode: httpStatusCode}, err);
                return next(err);
              }
              // return just public information about promo
              res.json({
                promoCode: promo.promoCode,
                expires: promo.expires,
                title: promo.title,
                description: promo.description,
                deposit: promo.deposit,
                redeemable: promo.redeemable
              });
            });
        });
      }
      // FIXME: add administrative services for creating/editing promos
      next();
  });

  app.server.get('/promos/:promoCode',
    ensureAuthenticated,
    function(req, res, next) {
      // get promo code from URL
      payswarm.promo.getPromo(
        req.user.identity, req.params.promoCode, function(err, promo) {
          if(err) {
            return next(err);
          }
          res.json(promo);
        });
  });

  callback();
}
