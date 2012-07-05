/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var events = require('events');
var program = require('commander');
var payswarm = require('payswarm-client');
var winston = require('winston');
var util = require('util');

var loadTester = {};
config = {};

// setup the logging framework
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

loadTester.performPurchases = function() {
  logger.info(
    util.format('Performing %d purchases...', config.purchases));
  for(var b = 0; b < config.purchases; b++) {
  }
};

loadTester.run = function() {
  program
    .version('0.9.0')
    // setup the command line options
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
  config.profiles = program.profiles || 1;
  config.listings = program.listings || 1;
  config.purchases = program.purchases || 1;
  config.numProfiles = 0;
  config.numListings = 0;

  // dump out the configuration
  logger.info('Config:', config);

  // setup the event listeners
  var eventEmitter = new events.EventEmitter();
  eventEmitter.on('profileCreated', function(profile) {
    config.numProfiles++;
    logger.info(util.format('Profile created: %j', profile));

    // start purchasing if all profiles and listings have been created
    if(config.numProfiles == config.profiles && 
       config.numListings == config.listings) {
      loadTester.performPurchases();
    }
  });
  eventEmitter.on('listingCreated', function(listing) {
    config.numListings++;
    logger.info(util.format('Listing created: %j', listing));

    // start purchasing if all profiles and listings have been created
    if(config.numProfiles == config.profiles && 
       config.numListings == config.listings) {
      loadTester.performPurchases();
    }
  });

  // create all the profiles and listings in parallel
  async.parallel([
    function() {
      // Create P new profiles
      logger.info(
        util.format('Creating %d profiles...', config.profiles));
      for(var p = 0; p < config.profiles; p++) {
        var profile = {};
        eventEmitter.emit('profileCreated', profile);
      }
    },
    function() {
      // Create L new listings
      logger.info(
        util.format('Creating %d listings...', config.listings));

      for(var p = 0; p < config.listings; p++) {
        // generate an asset ID
        crypto.randomBytes(4, function(ex, buf) {
          var assetId = assetId = buf.toString('hex');
          var assetUrl = 
            'http://listings.dev.payswarm.com/payswarm-auth-tests/' + assetId;

          // generate the asset
          var asset = {
            id: assetUrl,
            type: ['ps:Asset', 'pto:WebPage'],
            creator: {
              fullName: 'PaySwarm Test Software'
            },
            title : 'Test Asset ' + assetId,
            assetContent: assetUrl,
            assetProvider: "https://payswarm.dev:19443/i/vendor",
          };
          logger.info(util.format('Asset: %j', asset));

          // generate the listing
          var listing = {
            assetUrl: assetUrl,
            asset: asset,
          };

          eventEmitter.emit('listingCreated', listing);
        });
      }
    }
  ]);
};

// run the program
loadTester.run();

