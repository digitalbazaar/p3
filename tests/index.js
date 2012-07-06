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
  config.vendorKey = 

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
        createProfiles: function(callback) {
          logger.info(
            util.format('Creating %d profiles...', config.profiles));

          // Create P new profiles in batches
          async.forEachLimit(profilesArr, 25, 
            loadTester.createProfile,
            function(err) {
              if(!err) {
                callback(null, true); 
              }
              else {
                logger.error('Failed to create all profiles', err);
              }
            }
          );
        },
        createListings: function(callback) {
          logger.info(
            util.format('Creating %d listings...', config.listings));

          // Create L new listings in batches
          async.forEachLimit(assetIds, 25, 
            loadTester.createListing, 
            function(err) {
              if(!err) {
                callback(null, true); 
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

loadTester.createProfile = function(item, profileReadyCallback) {
  var profile = {};
  
  logger.info(util.format('Profile: %j', profile));
  
  profileReadyCallback();
},

loadTester.createListing = function(item, listingReadyCallback) {
  var assetUrl = 
    'http://listings.dev.payswarm.com/payswarm-auth-tests/' + item + "#asset";
  var listingUrl = 
    'http://listings.dev.payswarm.com/payswarm-auth-tests/' + item + "#listing";

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
    id: listingUrl,
    type: ['ps:Listing', 'gr:Offering'],
    payee: [{
      id: listingUrl + '-payee',
      type: 'com:Payee',
      destination: 'https://payswarm.dev:19443/i/vendor/accounts/primary',
      payeePosition: '0',
      payeeRate: '0.0500000',
      payeeRateType: 'com:FlatAmount',
      comment: 'Payment for Asset ' + item + '.'
    }],
    payeeRule : [{
      type: 'com:PayeeRule',
      accountOwnerType: 'ps:Authority',
      maximumPayeeRate: '10.0000000',
      payeeRateContext: ['com:Inclusive', 'com:Tax', 'com:TaxExempt'],
      payeeRateType: 'com:Percentage'
    }],
    asset: assetUrl,
    assetHash: '',
    license: 'http://purl.org/payswarm/licenses/blogging',
    licenseHash: 'ad8f72fcb47e867231d957c0bffb4c02d275926a',
    validFrom: '2012-07-05T20:35:21+00:00',
    validUntil: '2012-07-06T20:35:21+00:00',
  }
  logger.info(util.format('Listing: %j', listing));
  /*
  async.waterfall([
    function(callback) {
      payswarm.hash(asset, callback);
    },
    function(assetHash, callback) {
       listing.assetHash = assetHash;
       payswarm.sign(listing, callback);
    }],
    function(err, result) {
      if(!err) {
        listingReadyCallback();
      }
      else
      {
        logger.error('Failed to generate listing:', err);
      }
    }
  );
  */

  // notify async that the next item should be processed
  listingReadyCallback();
}

// run the program
loadTester.run();

