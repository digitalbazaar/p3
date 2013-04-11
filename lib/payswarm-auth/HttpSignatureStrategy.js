/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var passport = require('passport');
var payswarm = {
  identity: require('./identity'),
  profile: require('./profile'),
  tools: require('./tools')
};
var util = require('util');
var httpSignature = require('http-signature');
var PaySwarmError = payswarm.tools.PaySwarmError;

module.exports = Strategy;

/**
 * Creates a new SignedGraphStrategy for use with passport.
 */
function Strategy() {
  passport.Strategy.call(this);
  this.name = 'payswarm.httpSignature';
}
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate a request.
 *
 * @param req the request to authenticate.
 */
Strategy.prototype.authenticate = function(req) {
  var self = this;

  // check that message is signed with the Signature scheme
  // check for 'Authorization: Signature ...'
  var found = false;
  var auth = req.get('Authorization');
  if(auth) {
    var parts = auth.split(' ');
    if(parts && parts.length > 0 && parts[0] === 'Signature') {
      found = true;
    }
  }
  if(!found) {
    return self.fail(new PaySwarmError(
      'Request is not signed.',
      'payswarm.HttpSignatureStrategy.NotSigned'));
  }

  async.auto({
    parseRequest: function(callback) {
      try {
        callback(null, httpSignature.parseRequest(req));
      }
      catch(ex) {
        callback(new PaySwarmError(
          'Request signature parse error.',
          'payswarm.HttpSignatureStrategy.ParseError',
          null, ex));
      }
    },
    getPublicKey: ['parseRequest', function(callback, results) {
      var publicKey = {id: results.parseRequest.keyId};
      payswarm.identity.getIdentityPublicKey(publicKey,
        function(err, publicKey) {
          callback(err, publicKey);
      });
    }],
    verify: ['getPublicKey', function(callback, results) {
      try {
        var verified = httpSignature.verifySignature(
          results.parseRequest, results.getPublicKey.publicKeyPem);
        if(!verified) {
          callback(new PaySwarmError(
            'Request signature verification failed.',
            'payswarm.HttpSignatureStrategy.VerifyFailure'));
        }
        callback();
      }
      catch(ex) {
        callback(new PaySwarmError(
          'Request signature verify error.',
          'payswarm.HttpSignatureStrategy.VerifyError',
          {cause: ex}));
      }
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
