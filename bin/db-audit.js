/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
__libdir = require('path').resolve(__dirname, '../lib');
var _ = require('underscore');
var async = require('async');
var audit = require('../lib/payswarm-auth/audit');
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
      'Log level (silly, verbose, info, warn, debug, error, none)' +
      ' (default: info).', String, 'info')
    .option('--log-file <filename>',
      'Log file name (default: none).', String)
    .option('--log-file-level <level>',
      'Log level (silly, verbose, info, warn, debug, error, none)' +
      ' (default: info).', String, 'info')
    .option('--log-timestamps',
      'Log timestamps (default: false).')
    .option('--no-log-colorize',
      'Log timestamps (default: true).')
    .option('--no-progress', 'Disable progress (default: enabled).')
    .option('--account <id>', 'Audit one account (default: *).', String)
    .option('--stop-on-error', 'Stop when an error is detected (default: no).')
    .option('--modes <modes>', 'Audit modes (default: accounts).', 'accounts')
    .on('--help', function() {
      console.log('  The audit modes paramter takes a comma seperated list');
      console.log('  of modes from [accounts, validate].');
      console.log();
    })
    .parse(process.argv);

  // initialize the configuration
  config.config = program.config;
  config.logLevel = program.logLevel;
  config.logFile = program.logFile;
  config.logFileLevel = program.logFileLevel;
  config.logTimestamps = !!program.logTimestamps;
  config.logColorize = !!program.logColorize;
  config.progress = !!program.progress;
  config.account = program.account || '*';
  console.log('modes', program.modes);
  config.modes = program.modes.split(',');

  // setup the logging framework
  var _transports = [];
  if(config.logLevel !== 'none') {
    _transports.push(new winston.transports.Console({
      level: config.logLevel,
      timestamp: config.logTimestamps,
      colorize: config.logColorize
    }));
  }
  if(config.logFile && config.logFileLevel !== 'none') {
    _transports.push(new winston.transports.File({
      json: true,
      timestamp: config.logTimestamps,
      filename: config.logFile
    }));
  }
  logger = new (winston.Logger)({
    transports: _transports
  });

  // dump out the configuration
  logger.verbose('Config:', config);

  var vendors = [];
  var buyers = [];
  var listings = [];

  var doAccounts = (config.modes.indexOf('accounts') !== -1);
  var doValidate = (config.modes.indexOf('validate') !== -1);
  var collections = [];
  if(doAccounts) {
    collections = _.union(collections, [
      'account',
      'transaction'
    ]);
  }
  if(doValidate) {
    collections = _.union(collections, [
      'account',
      'asset',
      'budget',
      'contractCache',
      'distributedId',
      'identity',
      'license',
      'listing',
      'paymentToken',
      'profile',
      'promo',
      'promoCodeRedemption',
      'publicKey',
      'session',
      'transaction'
    ]);
  }

  async.waterfall([
    function(callback) {
      // initialize the audit module
      audit.init(config, collections, callback);
    },
    function(callback) {
      if(!doAccounts) {
        return callback();
      }
      // audit accounts
      var opts = {
        logger: logger,
        progress: config.progress,
        account: config.account
      };
      audit.accounts(opts, null, callback);
    },
    function(callback) {
      if(!doValidate) {
        return callback();
      }
      // validate
      var opts = {
        logger: logger,
        progress: config.progress
      };
      audit.validate(opts, null, callback);
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
  process.exit(1);
});

// run the program
main.run();
