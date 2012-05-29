/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var LocalStrategy = require('passport-local');
var payswarm = {
  logger: require('./payswarm.logger'),
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
        // identifier can be email address or profilename
        if(identifier.indexOf('@') !== -1) {
          // looks like an email
          payswarm.profile.resolveEmail(identifier, callback);
        }
        else {
          // must be a profilename
          payswarm.profile.resolveProfilename(identifier,
            function(err, result) {
              if(err) {
                return callback(err);
              }
              if(result) {
                // arrayify result
                return callback(null, [result]);
              }
              callback(null, null);
            });
        }
      },
      function(result, callback) {
        if(!result) {
          // profile not found
          return callback(null, []);
        }
        // try to authenticate each possible profile ID
        var matches = [];
        async.forEach(result, function(id, callback) {
          payswarm.profile.verifyProfilePassword({
            '@id': id,
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
          var actor = {'@id': matches[0]};
          async.auto({
            getProfile: function(callback) {
              payswarm.profile.getProfile(actor, matches[0], callback);
            },
            getIdentity: function(callback) {
              payswarm.identity.getProfileDefaultIdentity(
                actor, matches[0], callback);
            }
          }, function(err, result) {
            if(err) {
              return callback(err);
            }
            callback(null, {
              profile: result.getProfile[0],
              identity: result.getIdentity[0]
            });
          });
        }
      });
  });
  this.name = 'payswarm.password';
}
util.inherits(Strategy, LocalStrategy.Strategy);
