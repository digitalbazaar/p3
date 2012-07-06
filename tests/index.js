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
    .option('--vendor-profiles <num>',
      'The number of vendor profiles to create (default: 1).', Number)
    .option('--buyer-profiles <num>',
      'The number of buyer profiles to create (default: 1).', Number)
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
  config.vendorProfiles = program.vendorProfiles || 1;
  config.buyerProfiles = program.buyerProfiles || 1;
  config.listings = program.listings || 1;
  config.purchases = program.purchases || 1;
  config.batchSize = program.batchSize || 10;

  // dump out the configuration
  logger.info('Config:', config);

  var vendors = [];
  var buyers = [];
  var listings = [];

  async.auto({
    createVendorProfiles: function(callback) {
      logger.info(
        util.format('Creating %d vendor profiles...', config.vendorProfiles));
      // FIXME: don't use arrays for this
      async.forEachLimit(new Array(config.vendorProfiles), config.batchSize, 
        function(item, callback) {
          _createVendorProfile(vendors, callback);
      }, callback);
    },
    createBuyerProfiles: function(callback) {
      logger.info(
        util.format('Creating %d buyer profiles...', config.buyerProfiles));
      // FIXME: don't use arrays for this
      async.forEachLimit(new Array(config.buyerProfiles), config.batchSize, 
        function(item, callback) {
          _createBuyerProfile(buyers, callback);
      }, callback);
    },
    createListings: ['createVendorProfiles', 
      function(callback, results) {
        logger.info(util.format('Creating %d listings...', config.listings));
        async.forEachLimit(new Array(config.listings), config.batchSize,
          function(item, callback) {
            _createListing(vendors, listings, callback);
        }, callback);
    }],
    performPurchases: ['createBuyerProfiles', 'createListings',
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
 * Creates a vendor profile.
 *
 * @param the vendorProfile to set the newly created vendor to. 
 * @param callback(err) called once the operation completes.
 */
function _createVendorProfile(vendorProfiles, callback) {
  var md = crypto.createHash('md5');
  md.update(payswarmTools.uuid(), 'utf8');
  var id = md.digest('hex').substr(12);
  var email = 'vendor-' + id + '@digitalbazaar.com';

  async.waterfall([
    function(callback) {
      payswarm.createKeyPair({keySize: 512}, callback);
    },
    function(pair, callback) {
      // setup the vendor profile creation template
      var profileTemplate = {
        '@context': 'http://purl.org/payswarm/v1',
        email: email,
        psaPassword: 'password',
        psaPublicKeyPem: pair.publicKey,
        psaIdentity: {
          type: 'ps:VendorIdentity',
          psaSlug: 'pavendor-' + id,
          label: 'PaySwarm Vendor Test Identity'
        },
        account: {
          psaSlug: 'vending',
          label: 'Primary Vending Account'
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
            logger.error('Failed to create vendor profile: ', err.toString());
            return callback(err);
          }
          
          var profile = body;
          profile.psaPrivateKeyPem = pair.privateKey;
          logger.info('Vendor profile: ' + JSON.stringify(profile, null, 2));
          vendorProfiles.push(profile);
          callback(null);
        }
      );
    }
  ], callback);
}

/**
 * Creates a buyer profile.
 *
 * @param profiles the list of profiles to append to. 
 * @param callback(err) called once the operation completes.
 */
function _createBuyerProfile(buyerProfiles, callback) {
  var md = crypto.createHash('md5');
  md.update(payswarmTools.uuid(), 'utf8');
  var id = md.digest('hex').substr(12);
  var email = 'patest-' + id + '@digitalbazaar.com';

  async.waterfall([
    function(callback) {
      payswarm.createKeyPair({keySize: 512}, callback);
    },
    function(pair, callback) {
      // setup the buyer profile creation template
      var profileTemplate = {
        '@context': 'http://purl.org/payswarm/v1',
        email: email,
        psaPassword: 'password',
        psaPublicKeyPem: pair.publicKey,
        psaIdentity: {
          type: 'ps:PersonalIdentity',
          psaSlug: 'pabuyer-' + id,
          label: 'PaySwarm Buyer Test Identity',
        },
        account: {
          psaSlug: 'buying',
          label: 'Primary Buying Account'
        }
      };

      // create the profile 
      request.post({
        url: 'https://payswarm.dev:19443/test/profile/create',
        json: profileTemplate
      }, function(err, response, body) {
        if(!err && response.statusCode >= 400) {
          err = JSON.stringify(body, null, 2);
        }
        if(err) {
          logger.error('Failed to create buyer profile: ', err.toString());
          return callback(err);
        }

        var profile = body;
        profile.identity.privateKeyPem = pair.privateKey;
        logger.info('Buyer profile: ' + JSON.stringify(profile, null, 2));
        buyerProfiles.push(profile);
        callback(null);
      });
    }
  ], callback);
}

/**
 * Creates a listing.
 *
 * @param vendorProfile the vendor that is creating all of the listings.
 * @param listings the list of listings to append to. 
 * @param callback(err, listing) called once the operation completes.
 */
function _createListing(vendorProfile, listings, callback) {
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
