/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var program = require('commander');
var payswarm = require('payswarm-client');
var winston = require('winston');
var util = require('util');
var payswarmTools = require('../lib/payswarm-auth/payswarm.tools');
var request = require('request');

var loadTester = {};
config = {};

// setup the logging framework
var logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({timestamp: true}),
    new winston.transports.File({
      json: false, timestamp: true, filename: 'testing.log'})
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
    .option('--batch-size <num>',
      'The number of profiles/listings to create at a time (default: 10)',
      Number)
    .parse(process.argv);

  // initialize the configuration
  config.profiles = program.profiles || 1;
  config.listings = program.listings || 1;
  config.purchases = program.purchases || 1;
  config.batchSize = program.batchSize || 10;

  // dump out the configuration
  logger.info('Config:', config);

  var profiles = [];
  var listings = [];

  async.auto({
    createProfiles: function(callback) {
      logger.info(util.format('Creating %d profiles...', config.profiles));
      // FIXME: don't use arrays for this
      async.forEachLimit(new Array(config.profiles), config.batchSize, 
        function(item, callback) {
          _createProfile(profiles, callback);
      }, callback);
    },
    createListings: function(callback) {
      logger.info(util.format('Creating %d listings...', config.listings));
      async.forEachLimit(new Array(config.listings), config.batchSize,
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

// log uncaught exception and exit
process.on('uncaughtException', function(err) {
  logger.error(
    err.toString(), err.stack ? {stack: err.stack} : null);
  process.removeAllListeners('uncaughtException');
  process.exit();
});

// run the program
loadTester.run();

/**
 * Creates a profile.
 *
 * @param profiles the list of profiles to append to. 
 * @param callback(err) called once the operation completes.
 */
function _createProfile(profiles, callback) {
  var md = crypto.createHash('md5');
  md.update(payswarmTools.uuid(), 'utf8');
  var id = md.digest('hex').substr(12);
  var email = 'patest-' + id + '@digitalbazaar.com';

  // setup the profile creation template
  var profileTemplate = {
    '@context': 'http://purl.org/payswarm/v1',
    email: email,
    psaPassword: 'password',
    psaIdentity: {
      type: 'ps:PersonalIdentity',
      psaSlug: 'patest-' + id,
      label: 'PaySwarm Authority Test Identity'
    },
    account: {
      psaSlug: 'primary',
      label: 'Primary Account'
    }
  };
  
  // create the profile 
  request.post({
      url: 'https://payswarm.dev:19443/test/profile/create',
      json: profileTemplate
    },
    function(err, response, body) {
      if(!err && response.statusCode >= 400) {
        err = JSON.stringify(body, null, 2);
      }
      if(err) {
        logger.error('Failed to create profile: ', err.toString());
        return callback(err);
      }
      
      var profile = body;
      logger.info('Profile: ' + JSON.stringify(profile, null, 2));
      profiles.push(profile);
      callback(null);
    }
  );
}

/**
 * Creates a listing.
 *
 * @param listings the list of listings to append to. 
 * @param callback(err, listing) called once the operation completes.
 */
function _createListing(listings, callback) {
  var md = crypto.createHash('md5');
  md.update(payswarmTools.uuid(), 'utf8');
  var id = md.digest('hex').substr(12);
  var baseUrl = 'http://listings.dev.payswarm.com/payswarm-auth-tests/' + id;
  var assetId = baseUrl + '#asset';
  var listingId = baseUrl + '#listing';

  // generate the asset
  var asset = {
    id: assetId,
    type: ['ps:Asset', 'pto:WebPage'],
    creator: {
      fullName: 'PaySwarm Test Software'
    },
    title : 'Test Asset ' + id,
    assetContent: assetId,
    assetProvider: "https://payswarm.dev:19443/i/vendor",
  };

  // generate the listing validity dates
  var validFrom = new Date();
  var validUntil = new Date();
  validUntil.setFullYear(validFrom.getFullYear() + 1);
  
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
      comment: 'Payment for Asset ' + id + '.'
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
    validFrom: validFrom,
    validUntil: validUntil,
  };
  logger.info('Listing: ' + JSON.stringify(listing, null, 2));

  /*
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
  */
}
