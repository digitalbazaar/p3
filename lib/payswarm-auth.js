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

var api = {};
api.config = config;
module.exports = api;

// starts the payswarm-auth server
api.start = function() {
  program
    .version('0.9.0')
    .option('--log-level <level>', 'The console log level to use.')
    .parse(process.argv);

  // set console log level
  if(program.logLevel) {
    config.logger.console.level = program.logLevel;
  }

  // set up logger
  var logger = require('./payswarm-auth/payswarm.logger');

  if(cluster.isMaster) {
    // get the number of CPUs
    var cpus = require('os').cpus().length;

    // fork each app process
    var workers = config.server.workers;
    for(var i = 0; i < workers; ++i) {
      var worker = cluster.fork();
      logger.attach(worker);

      // shutdown worker on master process exit
      process.on('exit', function() {
        worker.send({
          type: 'app',
          message: 'exit'
        });
      });
    }

    // FIXME: restart worker instead? send critical error email?
    // kill master when worker dies
    cluster.on('death', function(worker) {
      logger.info('worker ' + worker.pid + ' died');
      process.kill(process.pid);
    });
  }
  else {
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
    app.server.use(express.logger({
      stream: {write: function(str) {logger.log('net', str);}}
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
    server.use(express.static(
      path.resolve(config.server.static),
      config.server.staticOptions));
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

    // switch user
    //process.setgid(userGid);
    //process.setuid(userUid);

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
