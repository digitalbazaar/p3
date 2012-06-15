/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var cluster = require('cluster');
var express = require('express');
var fs = require('fs');
var path = require('path');
var passport = require('passport');
var config = require('./payswarm.config');
var program = require('commander');
var connect = require('connect');
var loggers = require('./payswarm-auth/payswarm.loggers');

var api = {};
api.config = config;
module.exports = api;

// starts the payswarm-auth server
api.start = function() {
  program
    .version('0.9.0')
    .option('--log-level <level>', 'The console log level to use.')
    .option('--silent', 'Show no console output.')
    .option('--workers <num>',
      'The number of workers to use (0: # of cpus).', Number)
    .parse(process.argv);

  // set console log level
  if(program.logLevel) {
    config.logger.console.level = program.logLevel;
  }
  if(program.silent || program.logLevel === 'none') {
    config.logger.console.silent = true;
  }
  if('workers' in program) {
    config.server.workers = program.workers;
  }
  if(config.server.workers <= 0) {
    config.server.workers = require('os').cpus().length;
  }

  // set no limit on event listeners
  process.setMaxListeners(0);

  // set up logger
  var logger = loggers.get('app');

  if(cluster.isMaster) {
    if(config.environment !== 'development') {
      // switch user
      process.setgid(config.app.user.groupId);
      process.setuid(config.app.user.userId);
    }

    // set 'ps' title
    process.title = config.app.masterTitle;

    // fork a new worker if a worker dies
    cluster.on('death', function(worker) {
      logger.critical('worker ' + worker.pid + ' died');
      _startWorker();
    });

    // get the number of CPUs
    var cpus = require('os').cpus().length;

    // fork each app process
    var workers = config.server.workers;
    for(var i = 0; i < workers; ++i) {
      _startWorker();
    }
  }
  else {
    // set 'ps' title
    process.title = config.app.workerTitle;

    // log uncaught exception and exit
    process.on('uncaughtException', function(err) {
      logger.critical(
        'uncaught error: ' + err,
        err.stack ? {stack: err.stack} : null);
      process.removeAllListeners('uncaughtException');
      process.exit();
    });

    // create app
    var app = {};

    // create TLS server
    var server = express.createServer({
      key: fs.readFileSync(config.server.key),
      cert: fs.readFileSync(config.server.cert)
    });
    app.server = server;
    app.server.earlyHandlers = [];
    app.server.errorHandlers = [];

    // configure server
    var accessLogger = loggers.get('access');
    app.server.use(express.logger({
      stream: {write: function(str) {accessLogger.log('info', str);}}
    }));
    server.use(express.methodOverride());
    // parse JSON-LD bodies
    server.use(_parseJsonLd());
    server.use(express.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session(config.server.session));
    server.use(passport.initialize());
    server.use(passport.session());
    // all custom early handlers to be added later
    server.use(function(err, req, res, next) {
      var i = -1;
      var nextHandler = function(err) {
        i += 1;
        return i === server.earlyHandlers.length ?
          next(err) : server.earlyHandlers[i](err, req, res, nextHandler);
      };
      nextHandler(err);
    });
    // add each static path
    var tools = require(__dirname + '/payswarm-auth/payswarm.tools');
    for(var i = config.server.static.length - 1; i >= 0; --i) {
      var p = path.resolve(config.server.static[i]);
      // HACK: must clone options because it gets reused internally to
      // overwrite the path
      server.use(express.static(p, tools.clone(config.server.staticOptions)));
    }
    server.use(server.router);
    // all custom error handlers to be added later
    server.use(function(err, req, res, next) {
      var i = -1;
      var nextHandler = function(err) {
        i += 1;
        return i === server.errorHandlers.length ?
          next(err) : server.errorHandlers[i](err, req, res, nextHandler);
      };
      nextHandler(err);
    });
    if(config.environment === 'development') {
      server.use(express.errorHandler(
        {dumpExceptions: true, showStack: true}));
    }
    else {
      server.use(express.errorHandler());
    }

    // start server
    app.server.listen(config.server.port);
    logger.info('started server on port ' + config.server.port);

    // redirect plain http traffic to https
    var http = express.createServer();
    http.get('*', function(req, res) {
      res.redirect('https://' + config.server.host + req.url);
    });
    http.listen(config.server.httpPort);

    if(config.environment !== 'development') {
      // switch user
      process.setgid(config.app.user.groupId);
      process.setuid(config.app.user.userId);
    }

    // listen for master process exit
    process.on('message', function(msg) {
      if(msg.type && msg.type === 'app' && msg.message === 'exit') {
        // stop server and exit
        app.server.close();
        process.exit();
      }
    });

    // load dynamic modules
    var mods = config.modules;
    async.forEachSeries(config.modules, function loadModule(mod, callback) {
      mod = './payswarm-auth/payswarm.' + mod;
      logger.info('loading module: ' + mod);
      mod = require(mod);
      mod.init(app, function moduleLoaded(err) {
        if(!err) {
          logger.info('loaded module: "' + mod.name + '"');
        }
        callback(err);
      });
    }, function modulesLoaded(err) {
      if(err) {
        throw err;
      }
      else {
        logger.info('all modules loaded');
      }
    });
  }
};

// starts a new worker process
function _startWorker() {
  var worker = cluster.fork();
  loggers.attach(worker);

  // shutdown worker on master process exit
  process.on('exit', function() {
    worker.send({
      type: 'app',
      message: 'exit'
    });
  });
};

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
      req.on('data', function(chunk) {
        buf += chunk;
      });
      req.on('end', function(){
        if(strict && '{' != buf[0] && '[' != buf[0]) {
          return next(connect.utils.error(400));
        }
        try {
          req.body = JSON.parse(buf);
          next();
        }
        catch (err) {
          err.status = 400;
          next(err);
        }
      });
    });
  };
}
