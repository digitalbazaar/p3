/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var cluster = require('cluster');

var api = {};
module.exports = api;

/**
 * Attaches a message handler to the given worker. This should be called
 * by the master process to handle worker log messages.
 *
 * @param worker the worker to attach the message handler to.
 */
api.attach = function(worker) {
  // set up message handler for master process
  if(cluster.isMaster) {
    worker.on('message', function(msg) {
      if(msg.type === 'logger') {
        api.log.apply(api.log, msg.args);
      }
    });
  }
};

/**
 * Logs a message. If the logger is in 'master' mode, it will log the message
 * directly to the console. If not, it will send it via process.send() to
 * the master process to be logged.
 *
 * @param varargs the arguments for console.log.
 */
api.log = function() {
  if(cluster.isMaster) {
    console.log.apply(console, api.log.arguments);
  }
  else {
    var args = [];
    for(var key in api.log.arguments) {
      args.push(api.log.arguments[key]);
    }
    process.send({
      type: 'logger',
      args: args
    });
  }
};
