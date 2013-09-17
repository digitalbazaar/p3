/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
global.__libdir = require('path').resolve(__dirname, '../lib');
var async = require('async');
var crypto = require('crypto');
var events = require('events');
var fs = require('fs');
var payswarm = require('payswarm');
var tools = require('../lib/payswarm-auth/tools');
var pkginfo = require('pkginfo')(module, 'version');
var program = require('commander');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var util = require('util');
var winston = require('winston');

var strictSSL = false;

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
      begin: 0,
      purchases: 0
    }
  };
}
util.inherits(LoadTester, events.EventEmitter);
var config = {};
var logger = null;
var statsLogger = null;
var emitter = new events.EventEmitter();

var _defaultAuthority = 'https://payswarm.dev:19443';

LoadTester.prototype.run = function() {
  var self = this;

  // NOTE: set defaults in the config processing code below, not here
  program
    .version(module.exports.version)
    // setup the command line options
    .option('--log-level <level>',
      'Max console log level (default: info)',
      String)
    .option('-t, --target <host>',
      'The authority host to target (default: ' + _defaultAuthority + ')',
      String)
    .option('-a, --authority <authority>',
      'The authority name to use (default: ' + _defaultAuthority + ')',
      String)
    .option('--vendors <num>',
      'The number of vendor profiles to create (default: 1)',
      Number)
    .option('--buyers <num>',
      'The number of buyer profiles to create (default: 1)',
      Number)
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
    .option('-d, --delay <delay>',
      'Number of seconds between progress updates (default: 1.0)',
      Number)
    .option('-s, --save <statefile>',
      'Save state to specified file. (default: none)',
      String)
    .option('-l, --load <statefile>',
      'Load state from specified file. (default: none)',
      String)
    .parse(process.argv);

  async.auto({
    init: [
      function(callback) {
        callback();
      }],
    loadState: ['init',
      function(callback) {
        if(!program.load) {
          return callback();
        }
        async.waterfall([
          function(callback) {
            fs.readFile(program.load, callback);
          },
          function(data, callback) {
            config = JSON.parse(data);
            callback();
          }
        ], callback);
      }],
    config: ['loadState',
      function(callback, results) {
        function set(obj, name, defaultValue) {
          if(name in program) {
            obj[name] = program[name];
          } else if(!(name in obj)) {
            obj[name] = defaultValue;
          }
        }
        // initialize config from program or use defaults
        set(config, 'logLevel', 'info');
        set(config, 'target', _defaultAuthority);
        set(config, 'authority', _defaultAuthority);
        set(config, 'vendors', 1);
        set(config, 'buyers', 1);
        set(config, 'listings', 1);
        set(config, 'purchases', 1);
        set(config, 'batchSize', 10);
        set(config, 'statsLog', null);
        set(config, 'delay', 1.0);
        config.data = config.data || {};
        config.data.vendors = config.data.vendors || [];
        config.data.buyers = config.data.buyers || [];
        config.data.listings = config.data.listings || [];
        callback();
      }],
    logging: ['config',
      function(callback) {
        // setup logging
        logger = new (winston.Logger)({
          transports: [
            new winston.transports.Console(
              {timestamp: true, level: config.logLevel}),
            new winston.transports.File(
              {json: false, timestamp: true, filename: 'testing.log'})
          ]
        });
        var statsTransports = [];
        if(config.statsLog) {
          statsTransports.push(new winston.transports.File({
              json: true, timestamp: false, filename: config.statsLog}));
        }
        statsLogger = new (winston.Logger)({
          transports: statsTransports
        });
        callback();
      }],
    ready: ['config', 'logging',
      function(callback, results) {
        // warn for bad options
        if(program.load) {
          if(program.vendors || program.buyers || program.listings) {
            logger.warn('Options not used when loading state file.');
          }
        }
        // dump out the configuration (so settings are clear in the logs)
        // don't print out all vebose data
        var simpleConfig = tools.clone(config);
        delete simpleConfig.data;
        logger.info('Config:', simpleConfig);
        callback();
      }],
    createVendorProfiles: ['ready',
      function(callback) {
        if(config.data.vendors.length > 0) {
          return callback();
        }
        logger.info(util.format('Creating %d vendor profiles...',
          config.vendors));
        // FIXME: don't use arrays for this
        async.forEachLimit(new Array(config.vendors), config.batchSize,
          function(item, callback) {
            _createVendorProfile(self, config.data.vendors, callback);
        }, callback);
      }],
    createBuyerProfiles: ['ready',
      function(callback) {
        if(config.data.vendors.length > 0) {
          return callback();
        }
        logger.info(util.format('Creating %d buyer profiles...',
          config.buyers));
        // FIXME: don't use arrays for this
        async.forEachLimit(new Array(config.buyers), config.batchSize,
          function(item, callback) {
            _createBuyerProfile(self, config.data.buyers, callback);
        }, callback);
      }],
    createListings: ['ready', 'createVendorProfiles',
      function(callback, results) {
        if(config.data.listings.length > 0) {
          return callback();
        }
        logger.info(util.format('Creating %d listings...',
          config.listings));
        async.forEachLimit(new Array(config.listings), config.batchSize,
          function(item, callback) {
            _createListing(self, config.data.vendors, config.data.listings,
              callback);
        }, callback);
      }],
    saveState: ['createVendorProfiles', 'createBuyerProfiles', 'createListings',
      function(callback, results) {
        if(!program.save) {
          return callback();
        }
        var data = JSON.stringify(config, null, 2);
        fs.writeFile(program.save, data, callback);
      }],
    beginPurchases: ['saveState',
      function(callback, results) {
        self.stats.purchasing.begin = +new Date();
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
            _purchaseAsset(self, config.data.buyers, config.data.listings,
              callback);
        }, callback);
      }],
    endPurchases: ['performPurchases',
      function(callback, results) {
        self.stats.purchasing.end = +new Date();
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
  var now = +new Date();
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
  var begin = +new Date();
  var md = crypto.createHash('md5');
  md.update(tools.uuid(), 'utf8');
  var id = md.digest('hex').substr(12);
  var email = 'vendor-' + id + '@digitalbazaar.com';

  async.waterfall([
    function(callback) {
      payswarm.createKeyPair({keySize: 512}, callback);
    },
    function(pair, callback) {
      // setup the vendor profile creation template
      var profileTemplate = {
        '@context': 'https://w3id.org/payswarm/v1',
        email: email,
        psaPassword: 'password',
        psaPublicKey: {
          publicKeyPem: pair.publicKey,
          label: 'key-' + id
        },
        psaIdentity: {
          type: 'VendorIdentity',
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
          url: config.target + '/test/profile/create',
          json: profileTemplate,
          strictSSL: strictSSL
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
            end: +new Date()
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
  var begin = +new Date();
  var md = crypto.createHash('md5');
  md.update(tools.uuid(), 'utf8');
  var id = md.digest('hex').substr(12);
  var email = 'patest-' + id + '@digitalbazaar.com';

  async.waterfall([
    function(callback) {
      payswarm.createKeyPair({keySize: 512}, callback);
    },
    function(pair, callback) {
      // setup the buyer profile creation template
      var profileTemplate = {
        '@context': 'https://w3id.org/payswarm/v1',
        email: email,
        psaPassword: 'password',
        psaPublicKey: {
          publicKeyPem: pair.publicKey,
          label: 'key-' + id
        },
        psaIdentity: {
          type: 'PersonalIdentity',
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
        url: config.target + '/test/profile/create',
        json: profileTemplate,
        strictSSL: strictSSL
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
          end: +new Date()
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
  md.update(tools.uuid(), 'utf8');
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
        '@context': payswarm.CONTEXT_URL,
        id: assetId,
        type: ['Asset', 'pto:WebPage'],
        creator: {
          fullName: 'PaySwarm Test Software'
        },
        title: 'Test Asset ' + id,
        assetContent: assetId,
        assetProvider: vendor.identity.id,
        vendor: vendor.identity.id
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
        '@context': payswarm.CONTEXT_URL,
        id: listingId,
        type: ['Listing', 'gr:Offering'],
        vendor: vendor.identity.id,
        payee: [{
          id: listingId + '-payee',
          type: 'Payee',
          destination: config.authority + '/i/vendor/accounts/primary',
          currency: 'USD',
          payeeGroup: ['vendor'],
          payeeRate: '0.0005000',
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          comment: 'Payment for Asset ' + id + '.'
        }],
        payeeRule : [{
          type: 'PayeeRule',
          payeeGroupPrefix: ['authority'],
          maximumPayeeRate: '10.0000000',
          payeeRateType: 'Percentage',
          payeeApplyType: 'ApplyInclusively'
        }],
        asset: assetId,
        assetHash: assetHash,
        license: 'https://w3id.org/payswarm/licenses/blogging',
        licenseHash: 'urn:sha256:' +
          'd9dcfb7b3ba057df52b99f777747e8fe0fc598a3bb364e3d3eb529f90d58e1b9',
        validFrom: payswarm.w3cDate(validFrom),
        validUntil: payswarm.w3cDate(validUntil)
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
        '@context': 'https://w3id.org/payswarm/v1',
        '@graph': [signedAsset, signedListing]
      };

      // register the signed listing on listings.dev.payswarm.com
      request.post({
        headers: {'content-type': 'application/ld+json'},
        url: signedListing.id.split('#')[0],
        body: JSON.stringify(assetAndListing, null, 2),
        strictSSL: strictSSL
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
      signedListing['@context'] = payswarm.CONTEXT_URL;
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
  var begin = +new Date();
  var referenceId = tools.uuid();

  // select a random buyer to perform the purchase
  var buyer = buyers[Math.floor(Math.random() * buyers.length)];

  // select a random asset to purchase
  var listing = listings[Math.floor(Math.random() * listings.length)];

  // build the purchase request
  var purchaseRequest = {
    '@context': payswarm.CONTEXT_URL,
    type: 'PurchaseRequest',
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
    signedRequest['@context'] = 'https://w3id.org/payswarm/v1';
    request.post({
      url: config.target + '/transactions',
      json: signedRequest,
      strictSSL: strictSSL
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
        end: +new Date()
      });
      self.emit('purchasedAsset', receipt);
      callback();
    });
  });
}
