/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var cluster = require('cluster');
var express = require('express');
var fs = require('fs');
var path = require('path');
var config = require('./payswarm.config');

if(cluster.isMaster) {
  // set up logger
  var logger = require('./payswarm.logger');

  // get the number of CPUs
  var cpus = require('os').cpus().length;

  // fork each app process
  // FIXME: uncomment to use multiple cpus
  cpus = 1;
  for(var i = 0; i < cpus; ++i) {
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

  // kill master when worker dies
  cluster.on('death', function(worker) {
    logger.info('worker ' + worker.pid + ' died');
    process.kill(process.pid);
  });
}
else {
  // set up logger
  var logger = require('./payswarm.logger');

  // create app
  var app = {};

  // create server
  // FIXME: use TLS (pass 'key', etc to createServer)
  var server = express.createServer(/*{key: ''}*/);
  app.server = server;

  // configure server
  app.server.use(express.logger({
    stream: {write: function(str) {logger.log('net', str);}}
  }));
  server.use(express.methodOverride());
  server.use(express.bodyParser());
  server.use(express.cookieParser());
  server.use(express.session({secret: config.server.session.secret}));
  server.use(server.router);
  server.use(express.static(path.resolve(config.server.paths.static),
    {maxAge: config.server.cache.maxAge}));
  if(config.environment === 'development') {
    server.use(express.errorHandler({dumpExceptions: true, showStack: true}));
  }
  else {
    server.use(express.errorHandler());
  }

  // start server
  app.server.listen(config.server.port);
  logger.info('started server on port ' + config.server.port);

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
