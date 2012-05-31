/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var passport = require('passport');
var url = require('url');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
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
    passport.authenticate('payswarm.password', function(err, user, info) {
      if(!user) {
        err = new PaySwarmError(
          'The profile or email address and password combination ' +
          'you entered is incorrect.', MODULE_TYPE + '.InvalidLogin');
      }
      if(err) {
        return next(err);
      }

      if(user) {
        req.logIn(user, function(err) {
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
          return res.json(out);
        });
      }
    })(req, res, next);
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

  callback(null);
}
