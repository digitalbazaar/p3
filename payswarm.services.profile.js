/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var passport = require('passport');
var url = require('url');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  events: require('./payswarm.events'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
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
  app.server.get('/profile/create', function(req, res, next) {
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      vars.redirect = false;
      res.render('profile/create/create.tpl', vars);
    });
  });

  app.server.post('/profile/create', function(req, res, next) {
    var profileId = payswarm.profile.createProfileId(req.body['psa:slug']);
    var profileCreated = false;
    var identityCreated = false;

    async.auto({
      createProfile: function(callback) {
        // create profile
        var profile = {
          '@id': profileId,
          'psa:slug': req.body['psa:slug'],
          'foaf:mbox': req.body['foaf:mbox'],
          'rdfs:label': req.body['rdfs:label'],
          'psa:password': req.body['psa:password']
        };
        // generate gravatar url
        if('foaf:mbox' in profile) {
          // FIXME: use config for this
          var md = crypto.createHash('md5');
          md.update(profile['foaf:mbox'].toLowerCase(), 'utf8');
          profile['foaf:depiction'] = util.format(
            'https://secure.gravatar.com/avatar/%s', md.digest('hex'));
        }
        payswarm.profile.createProfile(null, profile, function(err, record) {
          // if profile is a duplicate, allow create to continue if the
          // password matches and the profile has no identities
          if(payswarm.db.isDuplicateError(err)) {
            var duplicateError = err;
            return async.auto({
              checkPassword: function(callback) {
                var pwProfile = {
                  '@id': profile['@id'],
                  'psa:password': req.body['psa:password']
                };
                payswarm.profile.verifyProfilePassword(pwProfile, callback);
              },
              checkIdentities: function(callback) {
                payswarm.identity.getProfileIdentities(
                  null, profile['@id'], function(err, records) {
                    if(err) {
                      return callback(err);
                    }
                    callback(null, records.length === 0);
                  });
              }
            }, function(err, results) {
              if(err) {
                return callback(err);
              }
              if(results.checkPassword && results.checkIdentities) {
                return payswarm.profile.getProfile(
                  null, profileId, function(err, profile) {
                    callback(err, profile);
                  });
              }
              callback(duplicateError);
            });
          }
          if(err) {
            return callback(err);
          }
          callback(null, record.profile);
        });
      },
      createIdentity: ['createProfile', function(callback, results) {
        profileCreated = true;
        // create identity
        var identityId = payswarm.identity.createIdentityId(
          req.body['psa:identity']['psa:slug']);
        var identity = {
          '@id': identityId,
          'ps:owner': profileId,
          'psa:slug': req.body['psa:identity']['psa:slug'],
          'rdfs:label': req.body['psa:identity']['rdfs:label']
        };
        // FIXME: should profile be used here as the actor?
        payswarm.identity.createIdentity(
          null, identity, function(err, record) {
            // ignore duplicate identity if owned by the profile
            if(payswarm.db.isDuplicateError(err)) {
              var duplicateError = err;
              return payswarm.identity.getIdentity(
                null, identityId, function(err, identity_) {
                  if(err) {
                    return callback(err);
                  }
                  if(identity['ps:owner'] !== profileId) {
                    return callback(duplicateError);
                  }
                  identity = identity_;
                  callback(null, identity);
                });
            }
            else if(err) {
              return callback(err);
            }
            callback(null, record.identity);
          });
      }],
      createAccount: ['createIdentity', function(callback, results) {
        identityCreated = true;
        var identityId = results.createIdentity['@id'];
        var accountId = payswarm.financial.createAccountId(
          identityId, req.body['com:account']['psa:slug']);
        var account = {
          '@id': accountId,
          'ps:owner': identityId,
          'psa:slug': req.body['com:account']['psa:slug'],
          'rdfs:label': req.body['com:account']['rdfs:label']
        };
        // FIXME: should profile be used here as the actor?
        payswarm.financial.createAccount(
          null, account, function(err, record) {
            if(err) {
              return callback(err);
            }
            callback(null, record.account);
          });
      }]
    }, function(err, results) {
      if(err) {
        if(payswarm.db.isDuplicateError(err)) {
          if(!profileCreated) {
            err = new PaySwarmError(
              'Could not create profile, it is a duplicate.',
              MODULE_TYPE + '.DuplicateProfile', {
                profile: profileId, 'public': true});
          }
          else if(!identityCreated) {
            err = new PaySwarmError(
              'Could not create identity, it is a duplicate.',
              MODULE_TYPE + '.DuplicateIdentity', {
                identity: identityId, 'public': true});
          }
          else {
            err = new PaySwarmError(
              'Could not create financial account, it is a duplicate.',
              MODULE_TYPE + '.DuplicateFinancialAccount', {
                account: accountId, 'public': true});
          }
        }
        return next(err);
      }
      // schedule profile created event
      var event = {
        type: 'payswarm.common.Profile.created',
        details: {
          profile: results.createProfile,
          identity: results.createIdentity,
          account: results.createAccount
        }
      };
      payswarm.events.emit(event.type, event);

      // auto-login profile
      req.body.profile = results.createProfile['psa:slug'];
      req.body.password = req.body['psa:password'];
      _login(req, res, next, function(err, user) {
        if(err) {
          return next(new PaySwarmError(
            'Could not create session for newly created profile.',
            MODULE_TYPE + '.AutoLoginFailed', {}, err));
        }
        res.json({ref: results.createIdentity['@id'] + '/dashboard'});
      });
    });
  });

  app.server.get('/profile/login', function(req, res, next) {
    // redirect authenticated requests to the referral URL
    if(req.isAuthenticated()) {
      var ref = req.query.ref || '/';
      return res.redirect(ref);
    }

    // not authenticated, send login page
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if('ref' in req.query) {
        vars.ref = req.query.ref;
      }
      // remove ref to login page
      if(vars.ref === '/profile/login') {
        // if ref isn't removed, it overrides identity page on login
        delete vars.ref;
      }
      res.render('profile/login.tpl', vars);
    });
  });

  app.server.post('/profile/login', function(req, res, next) {
    // normalize profile email/profilename input
    req.body.profile = req.body.profilename || req.body.profile;
    _login(req, res, next, function(err, user) {
      if(err) {
        return next(err);
      }
      var out = {};
      if(req.body.ref) {
        out.ref = req.body.ref;
      }
      else if(user.identity) {
        out.ref = user.identity['@id'] + '/dashboard';
      }
      else {
        out.ref = '/';
      }
      // FIXME: add method to do:
      // if(req.accepts('application/ld+json')) {
      //   res.header('Content-Type', 'application/ld+json');
      // }
      // FIXME: might need to just use res.send() instead of res.json(),
      // replace this in various services when done.
      // can do res.json(out, 200, {'Content-Type': 'application/ld+json'})
      res.json(out);
    });
  });

  app.server.get('/profile/logout', function(req, res, next) {
    if(req.session) {
      return req.session.destroy(function(err) {
        if(err) {
          next(err);
        }
        res.redirect('/');
      });
    }
    res.redirect('/');
  });

  app.server.post('/profile/switch', ensureAuthenticated,
    function(req, res, next) {
      // ensure profile can access identity
      payswarm.identity.getIdentity(
        req.user.profile, req.body.identity, function(err, identity) {
          // ignore exception, just do redirect without changing cookies
          if(!err) {
            // Note: Code does not check owner of identity in order to allow
            // privileged profiles to switch to non-owned identities.
            req.session.passport.user.identity = identity['@id'];
          }
          // do redirect
          res.redirect(req.body.redirect, 303);
        });
  });

  app.server.get('/profile/password', ensureAuthenticated,
    function(req, res, next) {
      getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        vars.profile = req.user.profile;
        res.render('profile/password/password.tpl');
      });
  });

  app.server.post('/profile/password/reset',
    function(req, res, next) {
      // either a profilename or email address
      var identifier = req.body['psa:identifier'];
      async.waterfall([
        function(callback) {
          payswarm.profile.resolveProfileIdentifier(identifier, callback);
        },
        function(profileIds, callback) {
          // try to set password for all profiles until one is successful
          var success = 0;
          async.until(function() {return success !== 0;}, function(callback) {
            if(profileIds.length === 0) {
              success = -1;
              return callback();
            }
            var next = profileIds.shift();
            var profile = payswarm.tools.clone(req.body);
            profile['@id'] = next;
            payswarm.profile.setProfilePassword(
              {'@id': next}, profile, function(err) {
                if(!err) {
                  success = 1;
                }
                callback();
              });
          }, function(err) {
            callback(null, success === 1);
          });
        },
        function(success, callback) {
          if(!success) {
            return callback(new PaySwarmError(
              'The password reset failed for the given profile.',
              MODULE_TYPE + '.PasswordResetFailed'), {
                'psa:identifier': req.body['psa:identifier'],
                httpStatusCode: 403,
                'public': true});
          }
          callback();
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send();
      });
  });

  app.server.get('/profile/passcode', function(req, res, next) {
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      vars.redirect = false;
      if('passcode' in req.query) {
        vars['psa:passcode'] = req.query.passcode;
      }
      res.render('profile/password/passcode.tpl', vars);
    });
  });

  app.server.post('/profile/passcode', function(req, res, next) {
    var identifier = req.body['psa:identifier'];
    async.waterfall([
      function(callback) {
        payswarm.profile.resolveProfileIdentifier(identifier, callback);
      },
      function(profileIds, callback) {
        // profile not found
        if(profileIds.length === 0) {
          return callback(new PaySwarmError(
            'The given profile or email-address does not exist.',
            MODULE_TYPE + '.ProfileNotFound'), {
              'psa:identifier': req.body['psa:identifier'],
              httpStatusCode: 404,
              'public': true
            });
        }
        // look up a single profile to get email address
        payswarm.profile.getProfile(
          null, profileIds[0], function(err, profile) {
            if(err) {
              return callback(err);
            }
            // send passcode for every profile match
            var profiles = [];
            for(var i in profileIds) {
              profiles.push({
                '@id': profileIds[i],
                'foaf:mbox': profile['foaf:mbox']
              });
            }
            payswarm.profile.sendProfilePasscodes(profiles, 'reset');
            callback();
          });
      }
    ], function(err) {
      if(err) {
        return next(err);
      }
    });
  });

  app.server.post('/profile/settings', ensureAuthenticated,
    function(req, res, next) {
      getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        vars.profile = req.user.profile;
        res.render('profile/settings/settings.tpl', vars);
      });
  });

  callback(null);
}

// perform login
function _login(req, res, next, callback) {
  passport.authenticate('payswarm.password', function(err, user, info) {
    if(!user) {
      err = new PaySwarmError(
        'The profile or email address and password combination ' +
        'you entered is incorrect.', MODULE_TYPE + '.InvalidLogin');
    }
    if(err) {
      return next(err);
    }
    req.logIn(user, function(err) {
      callback(err, user);
    });
  })(req, res, next);
}
