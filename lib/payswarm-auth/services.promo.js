/*
 * Copyright (c) 2013-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var brPassport = require('bedrock-passport');
var brValidation = require('bedrock-validation');
var payswarm = {
  constants: bedrock.config.constants,
  logger: bedrock.loggers.get('app'),
  promo: require('./promo'),
  tools: require('./tools')
};
var BedrockError = bedrock.util.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.promo';
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

  app.post('/promos',
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

  app.get('/promos/:promoCode',
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
