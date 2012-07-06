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

  // dump out the configuration
  logger.info('Config:', config);

  // create the listings array
  var listingsArr = [];
  for(var i = 0; i < config.listings; i++) {
    listingsArr.push(i)
  }
  
  // create the profiles array
  var profilesArr = [];
  for(var i = 0; i < config.profiles; i++) {
    profilesArr.push(i)
  }
  
  async.map(listingsArr, 
    // generate all of the random assetIds
    function(item, callback) {
      crypto.randomBytes(4, function(err, buf) {
        var assetId = buf.toString('hex');
        callback(null, assetId);
      });
    },
    // after all random assetIds are generated, perform profile/listing creation
    function(err, results) {
      logger.info('assetIDs:', results);
      
      // convert the previous step's results into an array of asset IDs
      var assetIds = [];
      for(k in results) {
        assetIds.push(results[k]);
      }
      
      // create all profiles and listings
      async.auto({
        createProfiles: function(profilesCompleteCallback) {
          // Create P new profiles in batches
          logger.info(
            util.format('Creating %d profiles...', config.profiles));
          async.forEachLimit(profilesArr, 25, 
            function(item, profileReadyCallback) {
              var profile = {};
              logger.info(util.format('Profile: %j', profile));
              
              profileReadyCallback();
            },
            function(err) {
              if(!err) {
                profilesCompleteCallback(null, true); 
              }
              else {
                logger.error('Failed to create all profiles', err);
              }
            }
          );
        },
        createListings: function(listingsCompleteCallback) {
          // Create L new listings in batches
          logger.info(
            util.format('Creating %d listings...', config.listings));

          async.forEachLimit(assetIds, 25, 
            function(item, listingReadyCallback) {
              var assetUrl = 
                'http://listings.dev.payswarm.com/payswarm-auth-tests/' + item;

              // generate the asset
              var asset = {
                id: assetUrl,
                type: ['ps:Asset', 'pto:WebPage'],
                creator: {
                  fullName: 'PaySwarm Test Software'
                },
                title : 'Test Asset ' + item,
                assetContent: assetUrl,
                assetProvider: "https://payswarm.dev:19443/i/vendor",
              };

              // generate the listing
              var listing = {
                assetUrl: assetUrl,
                asset: asset,
              };
              logger.info(util.format('Listing: %j', listing));
              
              // notify async that the next item should be processed
              listingReadyCallback();
            },
            function(err) {
              if(!err) {
                listingsCompleteCallback(null, true); 
              }
              else {
                logger.error('Failed to create all listings', err);
              }
            }
          );
        },
        performPurchases: ['createProfiles', 'createListings', 
          // perform the purchases after profiles and listings are created
          function(callback, results) {
            logger.info('createProfileResults:', results.createProfiles);
            logger.info('createListingsResults:', results.createListings);
            if(results.createProfiles && results.createListings) {
              logger.info(
                util.format('Performing %d purchases...', config.purchases));
            }
          }
        ]
      });
    }
  );
};

// run the program
loadTester.run();

