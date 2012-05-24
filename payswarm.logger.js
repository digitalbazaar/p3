/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var cluster = require('cluster');
var winston = require('winston');
var WinstonMail = require('winston-mail').Mail;
var util = require('util');
var payswarm = {
  config: require('./payswarm.config')
};

if(cluster.isMaster) {
  // create master logger
  var logger = new winston.Logger({
    transports: [
      new winston.transports.Console(payswarm.config.logger.console),
      new winston.transports.File(payswarm.config.logger.file),
      new WinstonMail(payswarm.config.logger.email)
    ]
  });

  /**
   * Attaches a message handler to the given worker. This should be called
   * by the master process to handle worker log messages.
   *
   * @param worker the worker to attach the message handler to.
   */
  logger.attach = function(worker) {
    // set up message handler for master process
    worker.on('message', function(msg) {
      if(msg.type === 'logger') {
        logger.log(msg.level, msg.msg, msg.meta);
      }
    });
  };
}
else {
  // create transport that transmits log message to master logger
  var WorkerTransport = function(options) {
    winston.Transport.call(this, options);
  };
  util.inherits(WorkerTransport, winston.Transport);
  WorkerTransport.prototype.name = 'worker';
  WorkerTransport.prototype.log = function(level, msg, meta, callback) {
    if(this.silent) {
      return callback(null, true);
    }

    // send logger message to master
    process.send({
      type: 'logger',
      level: level,
      msg: msg,
      meta: meta
    });
    this.emit('logged');
    callback(null, true);
  };

  // create worker logger
  var logger = new winston.Logger({
    transports: [new WorkerTransport()]
  });
  logger.log('test', 'this');
}

module.exports = logger;
