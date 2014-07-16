/*
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  financial: require('./financial'),
  logger: bedrock.module('loggers').get('app')
};

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
  payswarm.website = bedrock.module('bedrock.website');
  MODULE_NS = payswarm.website.namespace;

  // get whether unbacked credit email is available
  payswarm.website.addViewVarsHandler(function(req, vars, callback) {
    payswarm.financial.isUnbackedCreditEmailAvailable(
      req.user.identity.email, function(err, available) {
        if(!err && available) {
          vars.session.identity.sysUnbackedCreditEmailAvailable = true;
        }
        callback();
      });
  });

  callback();
};
