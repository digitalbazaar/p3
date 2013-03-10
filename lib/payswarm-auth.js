/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var cluster = require('cluster');
var express = require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');
var limiter = require(__dirname + '/payswarm-auth/limiter');
var passport = require('passport');
var config = require('./config');
var program = require('commander');
var connect = require('connect');
var loggers = require(__dirname + '/payswarm-auth/loggers');
var docs = require(__dirname + '/payswarm-auth/docs');
var tools = require(__dirname + '/payswarm-auth/tools');
var mongo = require('mongodb');
var MongoStore = require('connect-mongo')(express);
var pkginfo = require('pkginfo');

var api = {};
api.config = config;
module.exports = api;
// read package.json fields
pkginfo(module, 'version');

// starts the payswarm-auth server
api.start = function() {
  var startTime = +new Date();
  program
    .version(api.version)
    .option('--log-level <level>', 'The console log level to use.')
    .option('--silent', 'Show no console output.')
    .option('--workers <num>',
      'The number of workers to use (0: # of cpus).', Number)
    .parse(process.argv);

  // set console log level
  if(program.logLevel) {
    config.loggers.console.level = program.logLevel;
  }
  if(program.silent || program.logLevel === 'none') {
    config.loggers.console.silent = true;
  }
  if('workers' in program) {
    config.server.workers = program.workers;
  }
  if(config.server.workers <= 0) {
    config.server.workers = require('os').cpus().length;
  }

  // set no limit on event listeners
  process.setMaxListeners(0);

  // exit on terminate
  process.on('SIGTERM', function() {
    process.exit();
  });

  if(cluster.isMaster) {
    // set group to adm before initializing loggers
    if(config.environment !== 'development') {
      try {
        process.setgid('adm');
      }
      catch(ex) {
        console.log('Failed to set gid: ' + ex);
      }
    }
  }

  // initialize logging system
  loggers.init(function(err) {
    if(err) {
      // can't log, quit
      console.log('Error: ' + err);
      process.exit(1);
    }

    var logger = loggers.get('app');

    if(cluster.isMaster) {
      // set 'ps' title
      var args = process.argv.slice(2).join(' ');
      process.title = config.app.masterTitle + (args ? (' ' + args) : '');

      // log uncaught exception and exit
      process.on('uncaughtException', function(err) {
        logger.critical('uncaught error: ' + err, err);
        process.removeAllListeners('uncaughtException');
        process.exit(1);
      });

      logger.info(
        'running payswarm-auth master process...', {pid: process.pid});

      async.waterfall([
        function(callback) {
          if(config.environment !== 'down') {
            // initialize database
            _initDatabase(callback);
          }
          else {
            callback();
          }
        },
        function(callback) {
          // keep track of master state
          var masterState = {
            switchedUser: false,
            node8: true
          };

          // FIXME: remove after upgrade to node 0.8
          if(!('workers' in cluster)) {
            cluster.workers = {};
            masterState.node8 = false;
          }

          // notify workers to exit if master exits
          process.on('exit', function() {
            for(var id in cluster.workers) {
              cluster.workers[id].send({type: 'app', message: 'exit'});
            }
          });

          // handle worker death
          cluster.on('death', function(worker) {
            logger.critical('worker ' + worker.pid + ' died');

            if(!masterState.node8) {
              // FIXME: remove after upgrade to node 0.8
              delete cluster.workers[worker.pid];
            }

            // fork a new worker if a worker dies
            if(config.app.restartWorkers) {
              _startWorker(masterState);
            }
            else {
              process.exit(1);
            }
          });

          // get the number of CPUs
          var cpus = require('os').cpus().length;

          // fork each app process
          var workers = config.server.workers;
          for(var i = 0; i < workers; ++i) {
            _startWorker(masterState);
          }
        }
      ], function(err) {
        if(err) {
          logger.critical('Error: ' + err, err);
          process.exit(1);
        }
      });
    }
    else {
      // set 'ps' title
      var args = process.argv.slice(2).join(' ');
      process.title = config.app.workerTitle + (args ? (' ' + args) : '');

      // log uncaught exception and exit
      process.on('uncaughtException', function(err) {
        logger.critical('uncaught error: ' + err, err);
        process.removeAllListeners('uncaughtException');
        process.exit();
      });

      logger.info('running payswarm-auth worker process...');

      // create app
      var app = {};

      // listen for master process exit
      process.on('message', function(msg) {
        if(msg.type && msg.type === 'app' && msg.message === 'exit') {
          // stop server
          if(app && app.server) {
            app.server.close();
          }
          // exit
          process.exit();
        }
      });

      // create express server
      var server = express();
      app.server = server;
      app.server.earlyHandlers = [];
      app.server.errorHandlers = [];

      // init limiter
      limiter.init(app, function() {});

      // redefine logger token for remote-addr to use express-parsed ip
      // (includes X-Forwarded-For header if available)
      express.logger.token('remote-addr', function(req) {
        return req.ip;
      });

      // configure server
      var accessLogger = loggers.get('access');
      server.enable('trust proxy');
      server.use(express.logger({
        stream: {write: function(str) {accessLogger.log('info', str);}}
      }));
      server.use(express.methodOverride());
      // rate limit based on IP address
      server.use(limiter.ipRateLimit);
      // parse JSON-LD bodies
      server.use(_parseJsonLd());
      server.use(express.bodyParser());
      server.use(express.cookieParser(config.server.session.secret));
      server.use(express.session(tools.extend({
        store: new MongoStore({
          db: config.database.name,
          collection: config.database.session.collection,
          host: config.database.host,
          port: config.database.port,
          username: config.database.username,
          password: config.database.password,
          auto_reconnect: config.database.connectOptions.auto_reconnect,
          clear_interval: config.database.session.clearInterval,
          maxAge: config.database.session.maxAge
        })
      }, config.server.session)));
      server.use(passport.initialize());
      server.use(passport.session());
      // all custom early handlers to be added later
      server.use(function(req, res, next) {
        var i = -1;
        (function nextHandler() {
          i += 1;
          return i === server.earlyHandlers.length ?
            next() : server.earlyHandlers[i](req, res, nextHandler);
        })();
      });
      // compress static content
      server.use(express.compress());
      // add each static path
      for(var i = config.server.static.length - 1; i >= 0; --i) {
        var p = path.resolve(config.server.static[i]);
        server.use(express.static(p, config.server.staticOptions));
      }
      // do not cache non-static resources
      server.use(function(req, res, next) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
        next();
      });
      server.use(server.router);
      // all custom error handlers to be added later
      server.use(function(err, req, res, next) {
        var i = -1;
        (function nextHandler(err) {
          i += 1;
          return i === server.errorHandlers.length ?
            next(err) : server.errorHandlers[i](err, req, res, nextHandler);
        })(err);
      });
      if(config.environment === 'development') {
        server.use(express.errorHandler(
          {dumpExceptions: true, showStack: true}));
      }
      else {
        server.use(express.errorHandler());
      }

      // serve express via TLS server
      var https_ = https.createServer({
        key: fs.readFileSync(config.server.key),
        cert: fs.readFileSync(config.server.cert)
      }, app.server);

      // redirect plain http traffic to https
      var redirect = express();
      redirect.enable('trust proxy');
      redirect.use(express.logger({
        format: '(http) ' + express.logger['default'],
        stream: {write: function(str) {accessLogger.log('info', str);}}
      }));
      redirect.get('*', function(req, res) {
        res.redirect('https://' + config.server.host + req.url);
      });
      var http_ = http.createServer(redirect);

      // enable unlimited listeners on servers
      https_.setMaxListeners(0);
      http_.setMaxListeners(0);

      async.auto({
        buildDocIndex: function(callback) {
          docs.buildDocumentationIndex(callback);
        },
        httpsListen: ['buildDocIndex', function(callback) {
          async.forEach(config.server.bindAddr, function(addr, next) {
            https_.on('error', function(err) {throw err;});
            https_.listen(config.server.port, addr, function() {next();});
          }, callback);
        }],
        httpListen: ['buildDocIndex', function(callback) {
          async.forEach(config.server.bindAddr, function(addr, next) {
            http_.on('error', function(err) {throw err;});
            http_.listen(config.server.httpPort, addr, function() {next();});
          }, callback);
        }],
        loadModules: ['httpsListen', 'httpListen', function(callback) {
          // switch user
          if(config.environment !== 'development') {
            process.setgid(config.app.user.groupId);
            process.setuid(config.app.user.userId);
          }

          // send ready message to master
          process.send({type: 'ready'});

          var logger = loggers.get('app');
          logger.info('started server on port ' + config.server.port);

          // load dynamic modules based on environment
          var modules;
          if(config.environment in config.envModules) {
            modules = config.envModules[config.environment];
          }
          else {
            modules = config.modules;
          }
          async.forEachSeries(modules, function(mod, callback) {
            mod = __dirname + '/payswarm-auth/' + mod;
            logger.info('loading module: ' + mod);
            mod = require(mod);
            mod.init(app, function moduleLoaded(err) {
              if(!err) {
                logger.info('loaded module: "' + mod.name + '"');
              }
              callback(err);
            });
          }, callback);
        }]
      }, function(err) {
        if(err) {
          throw err;
        }
        logger.info('all modules loaded');
        var dtTime = +new Date() - startTime;
        logger.info('startup time: ' + dtTime + 'ms');
      });
    }
  });
};

// starts a new worker process
function _startWorker(state) {
  var worker = cluster.fork();

  if(!state.node8) {
    // FIXME: remove after upgrade to node 0.8
    cluster.workers[worker.pid] = worker;
  }

  loggers.attach(worker);

  // if app process user hasn't been switched yet, wait for a message
  // from a worker indicating it is ready
  if(!state.switchedUser) {
    // listen to exit requests from workers
    function exitRequestListener(msg) {
      if(msg.type && msg.type === 'app' && msg.message === 'exit') {
        process.exit(msg.status);
      }
    };
    worker.on('message', exitRequestListener);

    function listener(msg) {
      if(msg.type === 'ready') {
        worker.removeListener('message', listener);
        if(!state.switchedUser) {
          state.switchedUser = true;
          if(config.environment !== 'development') {
            // switch user
            process.setgid(config.app.user.groupId);
            process.setuid(config.app.user.userId);
          }
        }
      }
    };
    worker.on('message', listener);
  }
}

// parses a JSON-LD request body
function _parseJsonLd() {
  return function(req, res, next) {
    if(!req.is('application/ld+json')) {
      return next();
    }
    // cribbed from connect bodyParser
    var limit = connect.middleware.limit('1mb');
    var strict = false;
    if(req._body) {
      return next();
    }
    req.body = req.body || {};

    // flag as parsed
    req._body = true;

    // parse
    limit(req, res, function(err){
      if(err) {
        return next(err);
      }
      var buf = '';
      req.setEncoding('utf8');
      req.on('data', function(chunk) {buf += chunk;});
      req.on('end', function() {
        if(strict && '{' != buf[0] && '[' != buf[0]) {
          return next(connect.utils.error(400));
        }
        try {
          req.body = JSON.parse(buf);
          next();
        }
        catch(err) {
          err.status = 400;
          next(err);
        }
      });
    });
  };
}

// ensures the database is created and database user exists
function _initDatabase(callback) {
  var logger = loggers.get('app');

  var client = new mongo.Db(
    config.database.name, new mongo.Server(
      config.database.host, config.database.port,
      config.database.connectOptions),
      config.database.options);

  async.auto({
    open: function(callback) {
      logger.info('initializing database: mongodb://' +
        config.database.host + ':' +
        config.database.port + '/' +
        config.database.name);
      client.open(function(err, client) {
        callback(err);
      });
    },
    auth: ['open', function(callback) {
      // authenticate w/server as database user
      client.authenticate(
        config.database.username, config.database.password,
        function(err) {
          if(!err) {
            return callback(null, true);
          }
          if(err.errmsg === 'auth fails') {
            // auth failed, either DB didn't exist or bad credentials
            logger.info('database authentication failed for "' +
              config.database.name + '".');
            if(config.database.adminPrompt) {
              return callback(null, false);
            }
          }
          callback(err);
        });
    }],
    checkAuth: ['auth', function(callback, results) {
      // authenticated, finish
      if(results.auth) {
        return callback();
      }

      console.log('\nIf the database "' + config.database.name +
        '" or the user "' + config.database.username + '" do not exist and ' +
        'you want to create them now, enter the following information.');

      var localClient = null;
      var admin = {};
      async.waterfall([
        function(callback) {
          var prompt = require('prompt');
          prompt.start();
          prompt.get({
            properties: {
              username: {
                description: 'Enter the MongoDB administrator username',
                pattern: /^.{4,}$/,
                message: 'The username must be at least 4 characters.',
                'default': 'admin'
              },
              password: {
                description: 'Enter the MongoDB administrator password',
                pattern: /^.{8,}$/,
                message: 'The password must be at least 8 characters.',
                hidden: true,
                'default': 'password'
              }
            }
          }, callback);
        },
        function(results, callback) {
          // authenticate w/server as admin
          admin.username = results.username;
          admin.password = results.password;
          client.authenticate(
            admin.username, admin.password, {authdb: 'admin'}, callback);
        },
        function(auth, callback) {
          // see if the database user exists
          client.collection('system.users', callback);
        },
        function(collection, callback) {
          collection.findOne(
            {user: config.database.username}, {user: true},
            function(err, record) {
              if(err) {
                return callback(err);
              }
              // user exists, quit
              if(record) {
                logger.error(
                  'The configured database user does exist, but the given ' +
                  'credentials are invalid or the user was created or ' +
                  'changed moments ago by another process.');
                process.exit(1);
              }
              callback();
            });
        },
        function(callback) {
          // database user doesn't exist, create it
          client.addUser(
            config.database.username, config.database.password,
            config.database.writeOptions, function(err) {
              callback(err);
            });
        },
        function(callback) {
          // connect to local database to create user there as well
          localClient = client.db(config.database.local.name);
          localClient.open(function(err) {
            callback(err);
          });
        },
        function(callback) {
          // authenticate w/server as admin
          localClient.authenticate(
            admin.username, admin.password, {authdb: 'admin'}, callback);
        },
        function(auth, callback) {
          // create database user for local database
          localClient.addUser(
            config.database.username, config.database.password,
            config.database.writeOptions, function(err) {
              callback(err);
            });
        }
      ], function(err) {
        if(localClient) {
          // force close of local client (do not reuse connection)
          return localClient.close(true, function() {
            callback(err);
          });
        }
        callback(err);
      });
    }]
  }, function(err) {
    // force client close (do not reuse connection)
    client.close(true, function() {
      callback(err);
    });
  });
}
