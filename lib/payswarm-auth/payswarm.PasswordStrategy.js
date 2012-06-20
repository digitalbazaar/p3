/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var LocalStrategy = require('passport-local');
var payswarm = {
  logger: require('./payswarm.loggers').get('app'),
  profile: require('./payswarm.profile'),
  identity: require('./payswarm.identity'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// export strategy
module.exports = Strategy;

/**
 * Creates a new PasswordStrategy for use with passport.
 *
 * @param options the options to pass to the parent LocalStrategy.
 */
function Strategy(options) {
  var self = this;
  LocalStrategy.Strategy.call(
    this, options, function(identifier, password, callback) {
    async.waterfall([
      function(callback) {
        payswarm.profile.resolveProfileIdentifier(identifier, callback);
      },
      function(profileIds, callback) {
        // try to authenticate each possible profile ID
        var matches = [];
        async.forEach(profileIds, function(id, callback) {
          payswarm.profile.verifyProfilePassword({
            id: id,
            'psa:password': password
          }, function(err, verified) {
            if(err) {
              return callback(err);
            }
            if(verified) {
              matches.push(id);
            }
            callback();
          });
        }, function(err) {
          callback(err, matches);
        });
      }
    ], function(err, matches) {
        if(err) {
          return callback(err);
        }
        if(matches.length === 0) {
          return callback(
            null, false, {message: 'Invalid login credentials.'});
        }
        // multiple profiles authenticated, simply pass (do not do success)
        if(matches.length > 1) {
          return self.pass();
        }
        // single profile match, populate and return success
        if(matches.length === 1) {
          // look up profile and default identity
          var actor = {id: matches[0]};
          async.auto({
            getProfile: function(callback) {
              payswarm.profile.getProfile(actor, matches[0],
                function(err, profile) {
                  callback(err, profile);
              });
            },
            getIdentity: function(callback) {
              payswarm.identity.getProfileDefaultIdentity(
                actor, matches[0], function(err, identity) {
                  callback(err, identity);
                });
            }
          }, function(err, results) {
            if(err) {
              return callback(err);
            }
            callback(null, {
              profile: results.getProfile,
              identity: results.getIdentity
            });
          });
        }
      });
  });
  this.name = 'payswarm.password';
}
util.inherits(Strategy, LocalStrategy.Strategy);
