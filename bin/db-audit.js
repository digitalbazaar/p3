/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var audit = require('../lib/payswarm-auth/payswarm.audit');
var payswarm = require('payswarm');
var payswarmTools = require('../lib/payswarm-auth/payswarm.tools');
var pkginfo = require('pkginfo')(module, 'version');
var program = require('commander');
var request = require('request');
var util = require('util');
var winston = require('winston');

var main = {};
var config = {};

// setup the logging framework
var logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({timestamp: true}),
    new winston.transports.File({
      json: true, timestamp: true, filename: 'auditor.log'})
  ]
});

main.run = function() {
  program
    .version(module.exports.version)
    // setup the command line options
    .option('--account <id>',
      'Audit one account (default: all).', String)
    .option('--stop-on-error',
      'Stop when an error is detected (default: no).')
    .option('--verbose',
      'Verbose output (default: no).')
    .parse(process.argv);

  // initialize the configuration
  config.account = program.account || '*';
  config.verbose = program.verbose || false;

  // dump out the configuration
  logger.info('Config:', config);

  var vendors = [];
  var buyers = [];
  var listings = [];

  async.waterfall([
    function(callback) {
      // initialize the audit module
      audit.init(callback);
    },
    function(callback) {
      // audit accounts
      var opts = {
        logger: logger
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
