/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var path = require('path');
GLOBAL.__libdir = path.resolve(path.join(
  __dirname, '..', 'node_modules', 'bedrock', 'lib'));
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var request = require('request');

var config = {};

var program = bedrock.program
  // setup the command line options
  .option('--no-progress', 'Disable progress (default: enabled).')
  .option('--account <id>', 'Audit one account (default: *).')
  .option('--stop-on-error', 'Stop when an error is detected (default: no).')
  .option('--modes <modes>', 'Audit modes (default: accounts).', 'accounts')
  .on('--help', function() {
    console.log('  The audit modes paramter takes a comma seperated list');
    console.log('  of modes from [accounts, validate].');
    console.log();
  });

bedrock.start(main);

function main() {
  var audit = require('../lib/payswarm-auth/audit');

  // initialize the configuration
  config.progress = !!program.progress;
  config.account = program.account || '*';
  console.log('modes', program.modes);
  config.modes = program.modes.split(',');

  var logger = bedrock.module('loggers').get('app');

  // dump out the configuration
  logger.debug('Config:', config);

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
      'job',
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
