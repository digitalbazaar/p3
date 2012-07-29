/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var crypto = require('crypto');
var events = require('events');
var payswarm = require('payswarm');
var payswarmTools = require('../lib/payswarm-auth/payswarm.tools');
var pkginfo = require('pkginfo')(module, 'version');
var program = require('commander');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var util = require('util');
var winston = require('winston');

function LoadTester() {
  events.EventEmitter.call(this);
  this.stats = {
    counts: {
      vendors: 0,
      buyers: 0,
      listings: 0,
      purchases: 0
    },
    purchasing: {
      begin: 0,
      end: 0
    },
    recent: {
      being: 0,
      purchases: 0
    }
  };
};
util.inherits(LoadTester, events.EventEmitter);
var config = {};
var logger = null;
var statsLogger = null;
var emitter = new events.EventEmitter();

LoadTester.prototype.run = function() {
  var self = this;

  program
    .version(module.exports.version)
    // setup the command line options
    .option('--log-level <level>',
      'Max console log level (default: info)', String)
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
    .option('--stats-log <name>',
      'The name of the stats log file (default: none)',
      String)
    .option('-d, --delay <n>',
      'Number of seconds between progress updates (default: 1)',
      String)
    .parse(process.argv);

  // initialize the configuration
  config.logLevel = program.logLevel || 'info';
  config.vendorProfiles = program.vendorProfiles || 1;
  config.buyerProfiles = program.buyerProfiles || 1;
  config.listings = program.listings || 1;
  config.purchases = program.purchases || 1;
  config.batchSize = program.batchSize || 10;
  config.statsLog = program.statsLog || null;
  config.delay = program.delay || 1;

  // setup logging
  logger = new (winston.Logger)({
    transports: [
      new winston.transports.Console({timestamp: true, level: config.logLevel}),
      new winston.transports.File({
        json: false, timestamp: true, filename: 'testing.log'})
    ]
  });
  var statsTransports = [];
  console.log(config);
  if(config.statsLog) {
    statsTransports.push(new winston.transports.File({
        json: true, timestamp: false, filename: config.statsLog}));
  }
  statsLogger = new (winston.Logger)({
    transports: statsTransports
  });

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
          _createVendorProfile(self, vendors, callback);
      }, callback);
    },
    createBuyerProfiles: function(callback) {
      logger.info(
        util.format('Creating %d buyer profiles...', config.buyerProfiles));
      // FIXME: don't use arrays for this
      async.forEachLimit(new Array(config.buyerProfiles), config.batchSize,
        function(item, callback) {
          _createBuyerProfile(self, buyers, callback);
      }, callback);
    },
    createListings: ['createVendorProfiles',
      function(callback, results) {
        logger.info(util.format('Creating %d listings...', config.listings));
        async.forEachLimit(new Array(config.listings), config.batchSize,
          function(item, callback) {
            _createListing(self, vendors, listings, callback);
        }, callback);
      }],
    beginPurchases: ['createBuyerProfiles', 'createListings',
      function(callback, results) {
        self.stats.purchasing.begin = +new Date;
        self.emit('beginPurchases');
        callback();
      }],
    performPurchases: ['beginPurchases',
      function(callback, results) {
        logger.info(util.format(
          'Performing %d purchases...', config.purchases));
        // FIXME: Need a better way to limit purchases
        async.forEachLimit(new Array(config.purchases), config.batchSize,
          function(item, callback) {
            _purchaseAsset(self, buyers, listings, callback);
        }, callback);
      }],
    endPurchases: ['performPurchases',
      function(callback, results) {
        self.stats.purchasing.end = +new Date;
        self.emit('endPurchases');
        callback();
      }],
    done: ['endPurchases',
      function(callback, results) {
        self.emit('done');
      }]
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

// create LoadTester
var loadTester = new LoadTester();
var progressId = null;

// setup event handlers
loadTester.on('beginPurchases', function() {
  if(config.delay > 0) {
    progressId = setInterval(_stats, config.delay * 1000);
  }
});
loadTester.on('endPurchases', function() {
  if(progressId) {
    clearInterval(progressId);
  }
  _stats();
});
loadTester.on('done', function() {
  logger.info('Done');
});

// run the program
loadTester.run();

/**
 * Display stats.
 */
function _stats() {
  var now = +new Date;
  // overall
  var p = loadTester.stats.counts.purchases;
  var dt = (now - loadTester.stats.purchasing.begin) / 1000;
  // recent
  var rdp = p - loadTester.stats.recent.purchases;
  var rdt = (now - loadTester.stats.recent.begin) / 1000;
  // update recent
  loadTester.stats.recent.begin = now;
  loadTester.stats.recent.purchases = p;

  //logger.info(JSON.stringify(loadTester.stats.counts));
  logger.info(sprintf(
    'p:%d, dt:%0.3f, p/s:%0.3f rp/s:%0.3f',
    p, dt, p/dt, rdp/rdt));
}

/**
 * Creates a vendor profile.
 *
 * @param self the LoadTester
 * @param the vendorProfile to set the newly created vendor to.
 * @param callback(err) called once the operation completes.
 */
function _createVendorProfile(self, vendorProfiles, callback) {
  var begin = +new Date;
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
        psaPublicKey: {
          publicKeyPem: pair.publicKey,
          label: 'key-' + id
        },
        psaIdentity: {
          type: 'ps:VendorIdentity',
          psaSlug: 'vendor-' + id,
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
          profile.psaPublicKey.privateKeyPem = pair.privateKey;
          logger.verbose('Vendor profile: ' + JSON.stringify(profile, null, 2));
          vendorProfiles.push(profile);
          self.stats.counts.vendors++;
          statsLogger.info(profileTemplate.psaIdentity.psaSlug, {
            type: 'createdVendorProfile',
            begin: begin,
            end: +new Date
          });
          self.emit('createdVendorProfile', profile);
          callback(null);
        }
      );
    }
  ], callback);
}

/**
 * Creates a buyer profile.
 *
 * @param self the LoadTester
 * @param profiles the list of profiles to append to.
 * @param callback(err) called once the operation completes.
 */
function _createBuyerProfile(self, buyerProfiles, callback) {
  var begin = +new Date;
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
        psaPublicKey: {
          publicKeyPem: pair.publicKey,
          label: 'key-' + id
        },
        psaIdentity: {
          type: 'ps:PersonalIdentity',
          psaSlug: 'buyer-' + id,
          label: 'PaySwarm Buyer Test Identity'
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
        profile.psaPublicKey.privateKeyPem = pair.privateKey;
        logger.verbose('Buyer profile: ' + JSON.stringify(profile, null, 2));
        buyerProfiles.push(profile);
        self.stats.counts.buyers++;
        statsLogger.info(profileTemplate.psaIdentity.psaSlug, {
          type: 'createdBuyerProfile',
          begin: begin,
          end: +new Date
        });
        self.emit('createdBuyerProfile', profile);
        callback(null);
      });
    }
  ], callback);
}

/**
 * Creates a listing.
 *
 * @param self the LoadTester
 * @param vendorProfile the vendor that is creating all of the listings.
 * @param listings the list of listings to append to.
 * @param callback(err, listing) called once the operation completes.
 */
function _createListing(self, vendorProfiles, listings, callback) {
  var md = crypto.createHash('md5');
  md.update(payswarmTools.uuid(), 'utf8');
  var id = md.digest('hex').substr(12);
  var baseUrl = 'http://listings.dev.payswarm.com/test/' + id;
  var assetId = baseUrl + '#asset';
  var listingId = baseUrl + '#listing';
  var signingOptions = {};
  // grab a random vendor profile to associate with the asset and listing
  var vendor =
    vendorProfiles[Math.floor(Math.random() * vendorProfiles.length)];

  // set the options to use when signing the asset and the listing
  signingOptions.publicKeyId = vendor.psaPublicKey.id;
  signingOptions.privateKeyPem = vendor.psaPublicKey.privateKeyPem;

  // sign the asset, the listing, and upload both to the Web
  async.waterfall([
    function(callback) {
      // generate the asset
      var asset = {
        '@context': payswarm.createDefaultJsonLdContext(),
        id: assetId,
        type: ['ps:Asset', 'pto:WebPage'],
        creator: {
          fullName: 'PaySwarm Test Software'
        },
        title: 'Test Asset ' + id,
        assetContent: assetId,
        assetProvider: vendor.identity.id,
      };

      // sign the asset
      payswarm.sign(asset, signingOptions, callback);
    },
    function(signedAsset, callback) {
      // generate a hash for the signed asset
      payswarm.hash(signedAsset, function(err, assetHash) {
        callback(err, signedAsset, assetHash);
      });
    },
    function(signedAsset, assetHash, callback) {
      // generate the listing validity dates
      var validFrom = new Date();
      var validUntil = new Date();
      validUntil.setFullYear(validFrom.getFullYear() + 1);

      // generate the listing
      var listing = {
        '@context': payswarm.createDefaultJsonLdContext(),
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
        assetHash: assetHash,
        license: 'http://purl.org/payswarm/licenses/blogging',
        licenseHash: 'ad8f72fcb47e867231d957c0bffb4c02d275926a',
        validFrom: payswarm.w3cDate(validFrom),
        validUntil: payswarm.w3cDate(validUntil),
      };

      // sign the listing
      payswarm.sign(listing, signingOptions,
        function(err, signedListing) {
          callback(err, signedAsset, signedListing);
      });
    },
    function(signedAsset, signedListing, callback) {
      delete signedAsset['@context'];
      delete signedListing['@context'];
      var assetAndListing = {
        '@context': 'http://purl.org/payswarm/v1',
        '@graph': [signedAsset, signedListing]
      };

      // register the signed listing on listings.dev.payswarm.com
      request.post({
        headers: {'content-type': 'application/ld+json'},
        url: signedListing.id.split('#')[0],
        body: JSON.stringify(assetAndListing, null, 2)
      }, function(err, response, body) {
        if(!err && response.statusCode >= 400) {
          err = JSON.stringify(body, null, 2);
        }
        if(err) {
          logger.error('Failed to register signed asset and listing: ',
            err.toString());
          return callback(err);
        }

        logger.verbose('Registered signed asset and listing: ' +
          JSON.stringify(signedListing, null, 2));
        self.stats.counts.listings++;
        self.emit('createdListing', signedListing);
        callback(null, signedListing);
      });
    },
    function(signedListing, callback) {
      // generate the listing hash and store it for later use
      signedListing['@context'] = payswarm.createDefaultJsonLdContext();
      payswarm.hash(signedListing, function(err, hash) {
        if(err) {
          return callback(err);
        }
        delete signedListing['@context'];
        signedListing.listingHash = hash;
        listings.push(signedListing);
        callback();
      });
    }
  ], function(err) {
    if(err) {
      logger.error('Failed to register signed asset and listing:',
        err.toString());
    }
    callback(err);
  });
}

/**
 * Purchases a single asset given a list of buyers and listings. A single
 * buyer and listing will be selected.
 *
 * @param self the LoadTester
 * @param buyers the list of buyers.
 * @param listings the list of listings to use when purchasing.
 * @param callback(err) called once the operation completes.
 */
function _purchaseAsset(self, buyers, listings, callback) {
  var begin = +new Date;
  var referenceId = payswarmTools.uuid();

  // select a random buyer to perform the purchase
  var buyer = buyers[Math.floor(Math.random() * buyers.length)];

  // select a random asset to purchase
  var listing = listings[Math.floor(Math.random() * listings.length)];

  // build the purchase request
  var purchaseRequest = {
    '@context': payswarm.createDefaultJsonLdContext(),
    type: 'ps:PurchaseRequest',
    identity: buyer.identity.id,
    listing: listing.id,
    listingHash: listing.listingHash,
    referenceId: referenceId,
    source: buyer.account.id
  };

  payswarm.sign(purchaseRequest, {
    publicKeyId: buyer.psaPublicKey.id,
    privateKeyPem: buyer.psaPublicKey.privateKeyPem
  }, function(err, signedRequest) {
    if(err) {
      return callback(err);
    }

    // FIXME: This should be performed in payswarm.js
    signedRequest['@context'] = 'http://purl.org/payswarm/v1';
    request.post({
      url: 'https://payswarm.dev:19443/transactions',
      json: signedRequest
    }, function(err, response, body) {
      if(!err && response.statusCode >= 400) {
        err = JSON.stringify(body, null, 2);
      }
      if(err) {
        logger.error('Failed to purchase asset: ', err.toString());
        return callback(err);
      }

      var receipt = body;
      logger.verbose('Purchase receipt: ' + JSON.stringify(receipt, null, 2));
      self.stats.counts.purchases++;
      statsLogger.info('', {
        type: 'purchasedAsset',
        begin: begin,
        end: +new Date
      });
      self.emit('purchasedAsset', receipt);
      callback();
    });
  });
}
