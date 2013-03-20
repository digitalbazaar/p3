/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  profile: require('./profile'),
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
var validate = payswarm.validation.validate;
var getDefaultViewVars = payswarm.website.getDefaultViewVars;

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
            }, function(err) {
              if(err) {
                err = new PaySwarmError(
                  'The promotional code could not be redeemed.',
                  MODULE_TYPE + '.PromoCodeNotRedeemed', {'public': true}, err);
                return next(err);
              }
              res.send(201);
            });
        });
      }
      // FIXME: add administrative services for creating/editing promos
      next();
  });
}
