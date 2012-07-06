/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var express = require('express');
var fs = require('fs');
var jqtpl = require('jqtpl');
var passport = require('passport');
var path = require('path');
var url = require('url');
var LocalStrategy = require('passport-local');
var View = require('express/lib/view');
var payswarm = {
  config: require('../payswarm.config'),
  events: require('./payswarm.events'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
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
  'configuration',
  'profile',
  'identity',
  'address',
  'identifier',
  'key',
  'account',
  'budget',
  'paymentToken',
  'license',
  'transaction'
];

if(payswarm.config.environment === 'development') {
  modules.push('test');
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
      // permit multiple roots for express views
      _allowMultipleViewRoots(express);
      callback();
    },
    function(callback) {
      // configure the web server
      configureServer(app, callback);
    },
    // init service sub modules
    function(callback) {
      async.forEachSeries(modules, function(module, callback) {
        payswarm.services[module].init(app, callback);
      }, callback);
    },
    function(callback) {
      // add root services
      addServices(app, callback);
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
  // already authenticated
  if(req.isAuthenticated()) {
    return next();
  }
  async.waterfall([
    function(callback) {
      // do signature authentication check
      passport.authenticate('payswarm.signedGraph', function(err, user, info) {
        if(!user) {
          err = new PaySwarmError(
            'The request was not authenticated.',
            MODULE_TYPE + '.PermissionDenied');
        }
        if(err) {
          return callback(err);
        }
        // pass
        next();
      })(req, res, next);
    }
  ], function(err) {
    if(req.method === 'GET') {
      // include current route as redirect param
      var parsed = url.parse(req.url, true);
      var urlObject = {
        pathname: '/profile/login',
        query: {}
      };
      if(parsed.query.ref) {
        urlObject.query.ref = parsed.query.ref;
      }
      else if(parsed.pathname !== '/profile/login') {
        urlObject.query.ref = parsed.path;
      }
      return res.redirect(url.format(urlObject));
    }
    // use error handler
    if(err) {
      return next(err);
    }
  });
};

/**
 * Gets a copy of the default view variables.
 *
 * @param req the current request.
 * @param callback(err, vars) called once the operation completes.
 */
api.getDefaultViewVars = function(req, callback) {
  var vars = payswarm.tools.clone(payswarm.config.website.views.vars);

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

  if(!req.isAuthenticated()) {
    return callback(null, vars);
  }

  // add session vars
  var user = req.user;
  vars.session.auth = true;
  vars.session.loaded = true;
  vars.session.profile = payswarm.tools.clone(user.profile);
  if(user.identity) {
    vars.session.identity = payswarm.tools.clone(user.identity);
  }
  if(user.identity.label) {
    vars.session.name = user.identity.label;
  }
  else {
    vars.session.name = user.profile.label;
  };

  // FIXME: only retrieve IDs and names?
  // get identities
  var identities = vars.session.identities = {};
  var profileId = vars.session.profile.id;
  payswarm.identity.getProfileIdentities(
    {id: profileId}, profileId, function(err, records) {
      if(err) {
        return callback(err);
      }
      for(var i in records) {
        var identity = records[i].identity;
        identities[identity.id] = identity;
      }
      callback(null, vars);
    });
};

/**
 * Validates a PaySwarm ID from a URL path and, it passes validation, it
 * will be available via req.params. This method should be passed to an
 * express server's param call, eg:
 *
 * server.param(':foo', payswarmIdParam)
 *
 * @param req the request.
 * @parma res the response.
 * @param next the next handler.
 * @param id the id.
 */
api.payswarmIdParam = function(req, res, next, id) {
  var regex = /[a-zA-Z0-9][-a-zA-Z0-9~_\.]*/;
  if(!regex.test(id)) {
    res.redirect('/');
  }
  else {
    next();
  }
};

/**
 * Gets the client's IP address from the given request.
 *
 * @param req the request to check.
 *
 * @return the client's IP address.
 */
api.getRemoteAddress = function(req) {
  // IP may be forwarded, if so, return first in the list
  var forwardedIps = req.get('x-forwarded-for');
  if(forwardedIps) {
    return forwardedIps.split(',')[0];
  }
  return req.connection.remoteAddress;
};

/**
 * Configures the web server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function configureServer(app, callback) {
  // add jquery template support (turn off debug output)
  jqtpl.express.debug = function() {};
  var viewPaths = payswarm.config.website.views.path;
  var paths = [];
  if(Array.isArray(viewPaths)) {
    for(var i in viewPaths) {
      paths.push(path.resolve(viewPaths[i]));
    }
  }
  else {
    paths = path.resolve(viewPaths);
  }
  app.server.set('views', paths);
  // FIXME: required until jqtpl is updated to use express 3.0
  app.server.engine('.tpl', function(path, options, callback) {
    try {
      var str = _render(app, path, options);
      callback(null, str);
    }
    catch(ex) {
      callback(ex);
    }
  });

  // add common URL path params
  app.server.param(':identity', api.payswarmIdParam);
  app.server.param(':account', api.payswarmIdParam);
  app.server.param(':budget', api.payswarmIdParam);
  app.server.param(':publicKey', api.payswarmIdParam);
  app.server.param(':license', api.payswarmIdParam);

  // define passport user serialization
  passport.serializeUser(function(user, callback) {
    // save profile and identity ID
    var data = {
      profile: user.profile.id
    };
    if(user.identity) {
      data.identity = user.identity.id;
    }
    callback(null, data);
  });
  passport.deserializeUser(function(data, callback) {
    // look up profile and identity
    var actor = {id: data.profile};
    async.auto({
      getProfile: function(callback) {
        payswarm.profile.getProfile(
          actor, data.profile, function(err, profile) {
            if(err) {
              return callback(err);
            }
            callback(err, profile);
        });
      },
      getIdentity: function(callback) {
        if(data.identity === null) {
          return callback(null, null);
        }
        payswarm.identity.getIdentity(
          actor, data.identity, function(err, identity) {
            if(err) {
              return callback(err);
            }
            callback(err, identity);
          });
      }
    }, function(err, results) {
      if(err) {
        return callback(err);
      }
      var user = {
        profile: results.getProfile,
        identity: results.getIdentity
      };
      callback(null, user);
    });
  });

  // register authentication strategies
  passport.use(new payswarm.PasswordStrategy({
    usernameField: 'profile',
    passwordField: 'password'
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
      res.render('index.tpl', vars);
    });
  });

  // about page
  app.server.get('/about', function(req, res, next) {
    api.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('about.tpl', vars);
    });
  });

  // legal page
  app.server.get('/legal', function(req, res, next) {
    api.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('legal.tpl', vars);
    });
  });

  // contact page
  app.server.get('/contact', function(req, res, next) {
    api.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('contact.tpl', vars);
    });
  });

  // not found handler
  app.server.all('*', function(req, res, next) {
    api.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('errors/error-404.tpl', vars);
    });
  });

  // send errors
  app.server.errorHandlers.push(function(err, req, res, next) {
    if(err) {
      // handle forbidden
      if(req.method === 'GET' &&
        err instanceof PaySwarmError && err.name ===
        'payswarm.permission.PermissionDenied') {
        return api.getDefaultViewVars(req, function(err, vars) {
          if(err) {
            return next(err);
          }
          res.render('errors/error-403.tpl', vars);
        });
      }

      // handle other error
      if(!(err instanceof PaySwarmError)) {
        err = new PaySwarmError(
          'An error occurred.',
          MODULE_TYPE + '.Error', null, err);
      }
      // FIXME: check for 'critical' in exception chain and use
      // that log message instead of error ... and set up email logger
      // to only email critical messages
      payswarm.logger.error('Error', {error: err.toObject()});
      if(err.details && err.details.httpStatusCode) {
        res.statusCode = err.details.httpStatusCode;
      }
      else {
        // FIXME: differentiate between 4xx and 5xx errors
        res.statusCode = 500;
      }
      return res.json(err.toObject());
    }
    next();
  });

  callback(null);
}

// allows multiple view root paths to be used
function _allowMultipleViewRoots(express) {
  var old = View.prototype.lookup;
  View.prototype.lookup = function(path) {
    var self = this;
    var root = self.root;
    // if root is an array, try each root until the path exists
    if(Array.isArray(root)) {
      var exists = undefined;
      for(var i = root.length - 1; i >= 0; --i) {
        self.root = root[i];
        exists = old.call(self, path);
        if(exists) {
          self.root = root;
          return exists;
        }
      }
      self.root = root;
      return exists;
    }
    // fallback to standard behavior, when root is a single directory
    return old.call(self, path);
  };
}

// load service sub modules
payswarm.services = {};
for(var i in modules) {
  var name = modules[i];
  var module = './payswarm.services.' + name;
  payswarm.logger.info('loading website service module: ' + module);
  payswarm.services[name] = require(module);
}

// FIXME: remove once jqtpl supports express 3.0
function _render(app, path, options) {
  options.scope = {};
  options.data = options;
  options.partial = function(path) {
    return _renderPartial(app, path, options);
  };

  if(payswarm.config.website.views.enableCache) {
    // use cached template
    if(path in jqtpl.template) {
      return jqtpl.tmpl(path, options);
    }
  }

  // load template from disk
  var str = fs.readFileSync(path, 'utf8');
  if(payswarm.config.website.views.enableCache) {
    // cache template and render
    jqtpl.template(path, str);
    str = jqtpl.tmpl(path, options);
  }
  else {
    // no caching, compile and render
    str = jqtpl.tmpl(str, options);
  }
  return str;
}

// FIXME: remove once jqtpl supports express 3.0
function _renderPartial(app, name, options) {
  var self = app.server;
  var opts = {};
  var cache = self.cache;
  var engines = self.engines;
  var view = null;

  // support callback function as second arg
  if(typeof options === 'function') {
    fn = options;
    options = {};
  }

  // merge app.locals
  payswarm.tools.extend(opts, self.locals);

  // merge options.locals
  if(options.locals) {
    payswarm.tools.extend(opts, options.locals);
  }

  // merge options
  payswarm.tools.extend(opts, options);

  // set .cache unless explicitly provided
  opts.cache = (opts.cache == null) ?
    self.enabled('view cache') : opts.cache;

  // primed cache
  if(opts.cache) {
    view = cache[name];
  }

  // view
  if(!view) {
    view = new View(name, {
      defaultEngine: self.get('view engine'),
      root: self.get('views') || process.cwd() + '/views',
      engines: engines
    });

    if(!view.path) {
      throw new Error('Failed to lookup view "' + name + '"');
    }

    // prime the cache
    if(opts.cache) {
      cache[name] = view;
    }
  }

  // render
  return _render(app, view.path, opts);
}
