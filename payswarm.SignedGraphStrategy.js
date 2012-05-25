/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var payswarm = {
  config: require('./payswarm.config'),
  events: require('./payswarm.events'),
  logger: require('./payswarm.logger'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

module.exports = Strategy;

/**
 * Creates a new SignedGraphStrategy for use with passport.
 */
function Strategy() {
  passport.Strategy.call(this);
  this.name = 'payswarm.signedGraph';
}
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate a request.
 *
 * @param req the request to authenticate.
 */
Strategy.prototype.authenticate = function(req) {
  // FIXME: process request

  // FIXME: call error, fail, or success
  //var self = this;
  //self.error(err);
  //self.fail(info);
  //self.success(user, info);
};
