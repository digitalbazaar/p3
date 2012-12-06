/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var audit = require('../lib/payswarm-auth/audit');
var payswarm = require('payswarm');
var payswarmTools = require('../lib/payswarm-auth/tools');
var pkginfo = require('pkginfo')(module, 'version');
var program = require('commander');
var request = require('request');
var util = require('util');
var winston = require('winston');

var main = {};
var config = {};
var logger = null;

main.run = function() {
  program
    .version(module.exports.version)
    // setup the command line options
    .option('--config <config>',
      'Load a config file (default: none).', String)
    .option('--log-level <level>',
      'Log level (silly, verbose, info, warn, debug, error)' +
      ' (default: info).', String)
    .option('--log-timestamps',
      'Log timestamps (default: false).')
    .option('--no-log-colorize',
      'Log timestamps (default: true).')
    .option('--no-progress', 'Disable progress (default: enabled).')
    .option('--account <id>', 'Audit one account (default: all).', String)
    .option('--stop-on-error', 'Stop when an error is detected (default: no).')
    .parse(process.argv);

  // initialize the configuration
  config.config = program.config;
  config.logLevel = program.logLevel || 'info';
  config.logTimestamps = program.logTimestamps;
  config.logColorize = program.logColorize;
  config.progress = program.progress;
  config.account = program.account || '*';

  // setup the logging framework
  logger = new (winston.Logger)({
    transports: [
      new winston.transports.Console({
        level: config.logLevel,
        timestamp: config.logTimestamps,
        colorize: config.logColorize
      }),
      new winston.transports.File({
        json: true,
        timestamp: true,
        filename: 'auditor.log'
      })
    ]
  });

  // dump out the configuration
  logger.verbose('Config:', config);

  var vendors = [];
  var buyers = [];
  var listings = [];

  async.waterfall([
    function(callback) {
      // initialize the audit module
      audit.init(config, callback);
    },
    function(callback) {
      // audit accounts
      var opts = {
        logger: logger,
        progress: config.progress
      };
      audit.accounts(opts, null, callback);
    }
  ], function(err) {
    if(err) {
      logger.error('Error', err);
    }
    process.exit();
  });
};

// log uncaught exception and exit
process.on('uncaughtException', function(err) {
  logger.error(
    err.toString(), err.stack ? {stack: err.stack} : null);
  process.removeAllListeners('uncaughtException');
  process.exit();
});

// run the program
main.run();
