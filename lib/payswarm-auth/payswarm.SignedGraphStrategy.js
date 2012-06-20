/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var payswarm = {
  config: require('../payswarm.config'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
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
  var self = this;

  // FIXME: frame message in future?

  // check that message is signed
  if(!req.body || !req.body['sec:signature'] ||
    !req.body['sec:signature']['dc:creator']) {
    return self.fail(new PaySwarmError(
      'Incoming message is not signed.',
      'payswarm.SignedGraphStrategy.NotSigned'));
  }

  var publicKey = {id: req.body['sec:signature']['dc:creator']};
  async.auto({
    getPublicKey: function(callback) {
      // get public key
      payswarm.identity.getIdentityPublicKey(publicKey,
        function(err, publicKey) {
          callback(err, publicKey);
      });
    },
    verify: ['getPublicKey', function(callback, results) {
      // verify signature
      payswarm.security.verifyJsonLd(req.body, results.getPublicKey, callback);
    }],
    getIdentity: ['verify', function(callback, results) {
      // get identity without permission check
      payswarm.identity.getIdentity(
        null, results.getPublicKey['ps:owner'], function(err, identity) {
          callback(err, identity);
        });
    }],
    getProfile: ['getIdentity', function(callback, results) {
      // get profile without permission check
      payswarm.profile.getProfile(
        null, results.getIdentity['ps:owner'], function(err, profile) {
          callback(err, profile);
        });
    }]
  }, function(err, results) {
    if(err) {
      return self.error(err);
    }
    self.success({
      profile: results.getProfile,
      identity: results.getIdentity
    });
  });
};
