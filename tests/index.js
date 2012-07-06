/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var program = require('commander');
var payswarm = require('payswarm-client');
var winston = require('winston');
var util = require('util');
var payswarmTools = require('payswarm.tools');

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
  //config.vendorKey =

  // dump out the configuration
  logger.info('Config:', config);

  var profiles = [];
  var listings = [];

  async.auto({
    createProfiles: function(callback) {
      logger.info(util.format('Creating %d profiles...', config.profiles));
      // FIXME: don't use arrays for this
      async.forEach(new Array(config.profiles), batchSize,
        function(item, callback) {
          _createProfile(profiles, callback);
      }, callback);
    },
    createListings: function(callback) {
      logger.info(util.format('Creating %d listings...', config.listings));
      async.forEachLimit(new Array(config.listings), batchSize,
        function(item, callback) {
          _createListing(listings, callback);
      }, callback);
    },
    performPurchases: ['createProfiles', 'createListings',
      function(callback, results) {
        logger.debug('profiles', profiles);
        logger.debug('listings', listings);
        logger.info(util.format(
          'Performing %d purchases...', config.purchases));
      }
    ]
  }, function(err) {
    if(err) {
      logger.error('Error', err);
    }
  });
};

// run the program
loadTester.run();

/**
 * Creates a profile.
 *
 * @param callback(err) called once the operation completes.
 */
function _createProfile(callback) {
  var profile = {};

  logger.info(util.format('Profile: %j', profile));
  profiles.push(profile);

  callback(null);
}

/**
 * Creates a listing.
 *
 * @param callback(err, listing) called once the operation completes.
 */
function _createListing(callback) {
  var uuid = payswarmTools.uuid();
  var baseUrl = 'http://listings.dev.payswarm.com/payswarm-auth-tests/' + uuid;
  var assetId = baseUrl + '#asset';
  var listingId = baseUrl + '#listing';

  // generate the asset
  var asset = {
    id: assetId,
    type: ['ps:Asset', 'pto:WebPage'],
    creator: {
      fullName: 'PaySwarm Test Software'
    },
    title : 'Test Asset ' + uuid,
    assetContent: assetId,
    assetProvider: "https://payswarm.dev:19443/i/vendor",
  };

  // generate the listing
  var listing = {
    id: listingId,
    type: ['ps:Listing', 'gr:Offering'],
    payee: [{
      id: listingId + '-payee',
      type: 'com:Payee',
      destination: 'https://payswarm.dev:19443/i/vendor/accounts/primary',
      payeePosition: 0,
      payeeRate: '0.0500000',
      payeeRateType: 'com:FlatAmount',
      comment: 'Payment for Asset ' + uuid + '.'
    }],
    payeeRule : [{
      type: 'com:PayeeRule',
      accountOwnerType: 'ps:Authority',
      maximumPayeeRate: '10.0000000',
      payeeRateContext: ['com:Inclusive', 'com:Tax', 'com:TaxExempt'],
      payeeRateType: 'com:Percentage'
    }],
    asset: assetId,
    assetHash: '',
    license: 'http://purl.org/payswarm/licenses/blogging',
    licenseHash: 'ad8f72fcb47e867231d957c0bffb4c02d275926a',
    validFrom: '2012-07-05T20:35:21+00:00',
    validUntil: '2012-07-06T20:35:21+00:00',
  };
  logger.info(util.format('Listing: %j', listing));

  async.waterfall([
    function(callback) {
      payswarm.hash(asset, callback);
    },
    function(assetHash, callback) {
      listing.assetHash = assetHash;
      payswarm.sign(listing, callback);
    }
  ], function(err, result) {
    if(err) {
      logger.error('Failed to generate listing:', err);
    }
    else {
      listings.push(listing);
    }
    callback(err);
  });
}
