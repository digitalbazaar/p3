/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var payswarm = {
  config: require('../config'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools')
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
  if(!req.body || !req.body.signature || !req.body.signature.creator) {
    return self.fail(new PaySwarmError(
      'Incoming message is not signed.',
      'payswarm.SignedGraphStrategy.NotSigned'));
  }

  var publicKey = {id: req.body.signature.creator};
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
        null, results.getPublicKey.owner, function(err, identity) {
          callback(err, identity);
        });
    }],
    getProfile: ['getIdentity', function(callback, results) {
      // get profile without permission check
      payswarm.profile.getProfile(
        null, results.getIdentity.owner, function(err, profile) {
          callback(err, profile);
        });
    }]
  }, function(err, results) {
    if(err) {
      return self.error(err);
    }
    req.user = {
      profile: results.getProfile,
      identity: results.getIdentity
    };
    self.success(req.user);
  });
};
