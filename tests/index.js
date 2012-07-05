/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var program = require('commander');
var payswarm = require('payswarm-client');
var winston = require('winston');
var util = require('util');

var logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'testing.log' })
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'testing-exceptions.log' })
  ]
});

var loadTester = {};
loadTester.config = {};

loadTester.run = function() {
  program
    .version('0.9.0')
    .option('--state-file <filename>',
      'The name of the state file to use when performing tests.')
    .option('--profiles <num>',
      'The number of profiles to create (default: 1).', Number)
    .option('--listings <num>',
      'The number of listings to use when running the tests (default: 1)', 
      Number)
    .option('--purchases <num>',
      'The number of purchases to perform per profile/identity (default: 1)',
      Number)
    .parse(process.argv);

  // initialize the configuration 
  loadTester.config.profiles = program.profiles || 1;
  loadTester.config.listings = program.listings || 1;
  loadTester.config.purchases = program.purchases || 1;

  // dump out the configuration
  logger.info('Config:', loadTester.config);

  // Create P new profiles
  logger.info(
    util.format('Creating %d profiles...', loadTester.config.profiles));
  for(var p = 0; p < loadTester.config.profiles; p++) {
  }

  // Create L new listings
  logger.info(
    util.format('Creating %d listings...', loadTester.config.listings));
  for(var p = 0; p < loadTester.config.listings; p++) {
  }

  // Perform B purchases
  logger.info(
    util.format('Performing %d purchases...', loadTester.config.purchases));
  for(var b = 0; b < loadTester.config.purchases; b++) {
  }

};

// run the program
loadTester.run();

