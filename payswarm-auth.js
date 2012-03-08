/*
 * Copyright (c) 2011 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var cluster = require('cluster');
var express = require('express');
var config = require('./payswarm.config');

// get the number of CPUs
var cpus = require('os').cpus().length;

if(cluster.isMaster) {
  // set up logger
  var logger = require('./payswarm.logger');

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

  // restart worker when one dies
  cluster.on('death', function(worker) {
    logger.log('worker ' + worker.pid + ' died');
    // FIXME: uncomment to restart workers
    //var worker = cluster.fork();
    //logger.attach(worker);
    // FIXME: kill app on known errors that cause loops
    process.exit();
  });
}
else {
  // set up logger
  var logger = require('./payswarm.logger');

  // create app
  var app = {};

  // FIXME: create TLS server as well (just pass 'key', etc to createServer)
  app.server = express.createServer();
  //app.server = express.createServer({key: ''});

  // start server
  app.server.listen(config.server.port);
  logger.log('started server on port ' + config.server.port);

  // switch user
  //process.setgid(userGid);
  //process.setuid(UserUid);

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
    logger.log('loading module: ' + mod);
    mod = require(mod);
    mod.init(app, function moduleLoaded(err) {
      if(!err) {
        logger.log('loaded module: "' + mod.name + '"');
      }
      callback(err);
    });
  }, function modulesLoaded(err) {
    if(err) {
      throw err;
    }
    else {
      logger.log('all modules loaded');
    }
  });
}
