/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var passport = require('passport');
var path = require('path');
var LocalStrategy = require('passport-local');
var payswarm = {
  config: require('./payswarm.config'),
  events: require('./payswarm.events'),
  logger: require('./payswarm.logger'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools'),
  PasswordStrategy: require('./payswarm.PasswordStrategy'),
  SignedGraphStrategy: require('./payswarm.SignedGraphStrategy')
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
payswarm.services = {};
for(var i in modules) {
  var module = modules[i];
  payswarm.services[module] = require('./payswarm.services.' + module);
}

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
 * Gets a copy of the default view variables.
 *
 * @param req the current request.
 * @param callback(err, vars) called once the operation completes.
 */
api.getDefaultViewVars = function(req, callback) {
  var vars = payswarm.tools.clone(payswarm.config.website.views.vars);
  vars.data = 'foo';

  // used to set values in templates without output
  vars.set = function(v) {return '';};

  // displays a default value if the var isn't defined
  vars.display = function(v, def) {
    if(v) {
      return v;
    }
    return def;
  };

  // converts a var to json for later JSON.parse() via a page script
  vars.parsify = function(v) {
    return "JSON.parse('" + JSON.stringify(v).replace(/'/g, "\\'") + "')";
  };

  // include client timezone
  if(req.cookies.timezone) {
    vars.clientTimeZone = req.cookies.timezone;
  }

  if(!req.session.user) {
    return callback(null, vars);
  }

  // add session vars
  vars.session.auth = true;
  vars.session.loaded = true;
  vars.session.profile = payswarm.tools.clone(req.session.user.profile);
  if(req.session.user.identity) {
    vars.session.identity = payswarm.tools.clone(req.session.user.identity);
  }
  if(req.session.user.identity['rdfs:label']) {
    vars.session.name = req.session.user.identity['rdfs:label'];
  }
  else {
    vars.session.name = req.session.user.profile['rdfs:label'];
  };

  // FIXME: only retrieve IDs and names?
  // get identities
  var identities = vars.session.identities = {};
  var profileId = vars.session.profile['@id'];
  payswarm.identity.getProfileIdentities(
    {'@id': profileId}, profileId, function(err, records) {
      if(err) {
        return callback(err);
      }
      for(var i in records) {
        var identity = records[i].identity;
        identities[identity['@id']] = identity;
      }
      callback(null, vars);
    });
};

/**
 * Configures the web server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function configureServer(app, callback) {
  // add jquery template support
  app.server.set('views', path.resolve(payswarm.config.website.views.path));
  app.server.set('view options', payswarm.config.website.views.options);
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
  app.server.get('/', function(req, res, next) {
    api.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      vars.pageTitle = 'Welcome';
      vars.cssList.push('index');
      res.render('index.tpl', vars);
    });
  });

  // favicon.ico
  /*app.server.get('/favicon.ico', function(req, res) {
    res.header('Content-Length', 0);
    res.writeHead(404);
    res.end();
  });*/

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
