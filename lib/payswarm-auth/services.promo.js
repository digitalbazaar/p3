/*
 * Copyright (c) 2013-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  logger: require('./loggers').get('app'),
  promo: require('./promo'),
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
            payswarm.promo.redeemCode(req.user.profile, {
              promoCode: req.body.promoCode,
              account: req.body.account
            }, function(err, promo) {
              if(err) {
                var httpStatusCode = 500;
                if(err.details && err.details.httpStatusCode) {
                  httpStatusCode = err.details.httpStatusCode;
                }
                err = new PaySwarmError(
                  'The promotional code could not be redeemed.',
                  MODULE_TYPE + '.PromoCodeNotRedeemed', {
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
        req.user.profile, req.params.promoCode, function(err, promo) {
          if(err) {
            return next(err);
          }
          res.json(promo);
        });
  });

  callback();
}
