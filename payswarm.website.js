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
  tools: require('./payswarm.tools'),
  PasswordStrategy: require('./payswarm.PasswordStrategy'),
  SignedGraphStrategy: require('./payswarm.SignedGraphStrategy'),
  // service sub modules
  services: {
    profile: require('./payswarm.services.profile'),
    identity: require('./payswarm.services.identity'),
    identifier: require('./payswarm.services.identifier'),
    key: require('./payswarm.services.key'),
    account: require('./payswarm.services.account'),
    budget: require('./payswarm.services.budget'),
    license: require('./payswarm.services.license'),
    transaction: require('./payswarm.services.transaction')
  }
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.website';
var MODULE_IRI = 'https://payswarm.com/modules/website';

// module API
var api = {};
api.name = MODULE_TYPE + '.Website';
api.type = MODULE_TYPE;
api.iri = MODULE_IRI;
module.exports = api;

// service sub modules
var modules = [
  'profile',
  'identity',
  'identifier',
  'key',
  'account',
  'budget',
  'license',
  'transaction'
];

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
      // configure the web server
      configureServer(app, callback);
    },
    function(callback) {
      // add services
      addServices(app, callback);
    },
    // init service sub modules
    function(callback) {
      async.forEachSeries(modules, function(module, callback) {
        payswarm.services[module].init(app, callback);
      }, callback);
    }
  ], callback);
};

/**
 * Ensures a request has been authenticated. This method checks the current
 * website session for login credentials.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next route handler.
 */
api.ensureAuthenticated = function(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  // FIXME: include current route as redirect param
  res.redirect('/login');
};

/**
 * Configures the web server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function configureServer(app, callback) {
  // add jquery template support
  app.server.set('view options', {layout: false});
  app.server.register('.tpl', require('jqtpl').express);

  // define passport user serialization
  passport.serializeUser(function(user, callback) {
    // save profile and identity ID
    var data = {
      profile: user.profile['@id']
    };
    if(user.identity) {
      data.identity = user.identity['@id'];
    }
    callback(null, data);
  });
  passport.deserializeUser(function(data, callback) {
    // look up profile and identity
    var actor = {'@id': data.profile};
    async.auto({
      getProfile: function(callback) {
        payswarm.profile.getProfile(actor, data.profile, callback);
      },
      getIdentity: function(callback) {
        if(data.identity === null) {
          return callback(null, null);
        }
        payswarm.identity.getIdentity(actor, data.identity, callback);
      }
    }, function(err, result) {
      if(err) {
        return callback(err);
      }
      callback(null, {
        profile: result.getProfile,
        identity: result.getIdentity
      });
    });
  });

  // register authentication strategies
  passport.use(new payswarm.PasswordStrategy({
    'usernameField': 'profile',
    'passwordField': 'password'
  }));
  passport.use(new payswarm.SignedGraphStrategy());

  callback(null);
}

/**
 * Adds web services to this server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  // main interface
  app.server.get('/', function(req, res) {
    res.sendfile('index.html');
  });

  // favicon.ico
  app.server.get('/favicon.ico', function(req, res) {
    res.header('Content-Length', 0);
    res.writeHead(404);
    res.end();
  });

  // FIXME: example of protected resource
  /*app.server.get('/foo', ensureAuthenticated, function(req, res) {
    res.render('foo.tpl', {user: req.user});
  });*/

  // FIXME: example of path param
  app.server.get('/foo/:bar', function(req, res) {
    if(req.bar) {
      res.render('foobar.tpl', {
        var1: 'foo',
        var2: 'bar'
      });
    }
    else {
      res.redirect('/');
    }
  });
  app.server.param(':bar', function(req, res, next, bar) {
    // FIXME: validate bar
    var regex = /[-_a-zA-Z0-9]+/;
    if(!regex.test(bar)) {
      res.redirect('/');
    }
    else {
      req.bar = bar;
      next();
    }
  });

  // send errors
  app.server.errorHandlers.push(function(err, req, res, next) {
    if(err) {
      if(!(err instanceof PaySwarmError)) {
        err = new PaySwarmError(
          'An error occurred.',
          MODULE_TYPE + '.Error', null, err);
      }
      payswarm.logger.error('Error', err.toObject());
      return res.json(err.toObject());
    }
    next();
  });

  callback(null);
}
