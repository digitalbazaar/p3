/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var cluster = require('cluster');
var winston = require('winston');
var WinstonMail = require('winston-mail').Mail;
var util = require('util');
var fs = require('fs');
var posix = require('posix');
var payswarm = {
  config: require('../payswarm.config')
};

// create custom logging levels
var levels = {
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  error: 4,
  critical: 5,
  alert: 6,
  emergency: 7
};
var colors = {
  debug: 'blue',
  info: 'green',
  notice: 'yellow',
  warning: 'orange',
  error: 'red',
  critical: 'red',
  alert: 'yellow',
  emergency: 'red'
};

// create the container for the master and all of the workers
var container = new winston.Container();
module.exports = container;

/**
 * Initializes the logging system.
 *
 * @param callback(err) called once the operation completes.
 */
container.init = function(callback) {
  if(cluster.isMaster) {
    // create shared transports
    var transports = {
      console: new winston.transports.Console(payswarm.config.loggers.console),
      app: new winston.transports.File(payswarm.config.loggers.app),
      access: new winston.transports.File(payswarm.config.loggers.access),
      error: new winston.transports.File(payswarm.config.loggers.error),
      email: new WinstonMail(payswarm.config.loggers.email)
    };

    // set unique names for file transports
    transports.app.name = 'app';
    transports.access.name = 'access';
    transports.error.name = 'error';

    async.waterfall([
      function(callback) {
        // ensure all files are created and have ownership set to the
        // application process user
        var filenames = [
          payswarm.config.loggers.app.filename,
          payswarm.config.loggers.access.filename,
          payswarm.config.loggers.error.filename
        ];
        async.forEach(filenames, function(filename, callback) {
          try {
            var fd = fs.openSync(filename, 'a');
            if(payswarm.config.environment !== 'development') {
              var uid = payswarm.config.app.user.userId;
              if(typeof uid !== 'number') {
                var user = posix.getpwnam(uid);
                if(!user) {
                  return callback(new Error(
                    'Unknown system user: "' + uid + '"'));
                }
                uid = user.uid;
              }
              fs.fchownSync(fd, uid, process.getgid());
            }
            fs.closeSync(fd);
            callback();
          }
          catch(ex) {
            return callback(ex);
          }
        }, callback);
      },
      function(callback) {
        // create master loggers
        for(var cat in payswarm.config.loggers.categories) {
          var transportNames = payswarm.config.loggers.categories[cat];
          var options = {transports: []};
          for(var i in transportNames) {
            options.transports.push(transports[transportNames[i]]);
          }
          var logger = new winston.Logger(options);
          logger.setLevels(levels);
          container.loggers[cat] = logger;
        }

        // set the colors to use on the console
        winston.addColors(colors);

        /**
         * Attaches a message handler to the given worker. This should be
         * called by the master process to handle worker log messages.
         *
         * @param worker the worker to attach the message handler to.
         */
        container.attach = function(worker) {
          // set up message handler for master process
          worker.on('message', function(msg) {
            if(msg.type === 'logger') {
              container.get(msg.category).log(msg.level, msg.msg, msg.meta);
            }
          });
        };

        callback();
      }
    ], callback);
  }
  else {
    // define transport that transmits log message to master logger
    var WorkerTransport = function(options) {
      winston.Transport.call(this, options);
      this.category = options.category;
    };
    util.inherits(WorkerTransport, winston.Transport);
    WorkerTransport.prototype.name = 'worker';
    WorkerTransport.prototype.log = function(level, msg, meta, callback) {
      if(this.silent) {
        return callback(null, true);
      }

      // include the worker PID in the meta information
      meta = meta || {};
      meta.workerPid = process.pid;

      // send logger message to master
      process.send({
        type: 'logger',
        level: level,
        msg: msg,
        meta: meta,
        category: this.category
      });
      this.emit('logged');
      callback(null, true);
    };

    // create worker loggers
    for(var cat in payswarm.config.loggers.categories) {
      var logger = new winston.Logger({
        transports: [new WorkerTransport({level: 'debug', category: cat})]
      });
      logger.setLevels(levels);
      container.loggers[cat] = logger;
    }

    // set the colors to use on the console
    winston.addColors(colors);

    callback();
  }
};
