/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');

var logger = bedrock.loggers.get('app');

bedrock.events.on('bedrock-cli.init', function(callback) {
  bedrock.program
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
  callback();
});

bedrock.events.on('bedrock-cli.ready', function(callback) {
  var config = bedrock.config.audit;

  // initialize the configuration
  config.progress = !!bedrock.program.progress;
  config.account = bedrock.program.account || '*';
  console.log('modes', bedrock.program.modes);
  config.modes = bedrock.program.modes.split(',');

  // dump out the configuration
  logger.debug('Audit config:', config);

  config.checks = {};
  config.checks.accounts =
    (config.modes.indexOf('accounts') !== -1);
  config.checks.validate =
    (config.modes.indexOf('validate') !== -1);
  config.collections = [];
  if(config.checks.accounts) {
    config.collections = _.union(
      config.collections, [
      'account',
      'transaction'
    ]);
  }
  if(config.checks.validate) {
    config.collections = _.union(
      config.collections, [
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
  callback();
});

bedrock.events.on('bedrock.start', function(callback) {
  bedrock.runOnce('payswarm-audit.audit', function(callback) {
    async.waterfall([
      function(callback) {
        if(!bedrock.config.audit.checks.accounts) {
          return callback();
        }
        // audit accounts
        var opts = {
          logger: logger,
          progress: bedrock.config.audit.progress,
          account: bedrock.config.audit.account
        };
        audit.accounts(opts, null, callback);
      },
      function(callback) {
        if(!bedrock.config.audit.checks.validate) {
          return callback();
        }
        // validate
        var opts = {
          logger: logger,
          progress: bedrock.config.audit.progress
        };
        audit.validate(opts, null, callback);
      }
    ], function(err) {
      if(err) {
        logger.error('Error', err);
      }
      // FIXME: properly quit bedrock
      process.exit();
      //callback();
    });
  }, callback);
});

// FIXME: just needed so generic bin config is setup
require('bedrock-express');
require('bedrock-server');
require('bedrock-views');
require('bedrock-i18n');
require('bedrock-passport');
require('bedrock-docs');
require('bedrock-request-limiter');
require('bedrock-idp');

require('bedrock-mongodb');
require('bedrock-identity');
var audit = require('../lib/payswarm-auth/audit');

bedrock.start();
