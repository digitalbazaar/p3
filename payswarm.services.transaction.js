/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld');
var payswarm = {
  asset: require('./payswarm.resource'),
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;

// constants
var MODULE_TYPE = payswarm.website.type;
var MODULE_IRI = payswarm.website.iri;

// sub module API
var api = {};
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      addServices(app, callback);
    }
  ], callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  app.server.post('/transactions', ensureAuthenticated,
    function(req, res, next) {
      if(req.query.quote === true) {
        return _postTransactionsQuote(req, res, next);
      }
      if(jsonld.hasValue(req.body, '@type', 'ps:Contract')) {
        return _processContract(req, res, next);
      }
      if(jsonld.hasValue(req.body, '@type', 'com:Deposit')) {
        return _processDeposit(req, res, next);
      }
      if(jsonld.hasValue(req.body, '@type', 'com:Withdrawal')) {
        return _processWithdrawal(req, res, next);
      }
      if(jsonld.hasValue(req.body, '@type', 'ps:PurchaseRequest')) {
        return _processPurchaseRequest(req, res, next);
      }
      _processTransfer(req, res, next);

      // FIXME: make service validator catch other types
  });

  app.server.get('/transactions', ensureAuthenticated,
    function(req, res, next) {
      if(req.query.form === 'pay') {
        return _getPaymentForm(req, res, next);
      }
      _getTransactions(req, res, next);
  });

  callback(null);
}

/**
 * Handles a request for a Transaction quote.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _postTransactionsQuote(req, res, next) {
  async.auto({
    getAcquirer: function(callback) {
      // get acquirer based on source account owner
      payswarm.financial.getAccount(
        req.user.profile, req.body['com:source'], function(err, account) {
          if(err) {
            return callback(err);
          }
          callback(null, {'@id': account['ps:owner']});
        });
    },
    getListing: function(callback) {
      var query = {
        id: req.body['ps:listing'],
        hash: req.body['ps:listingHash'],
        type: 'ps:Listing',
        store: true,
        strict: true,
        fetch: true
      };
      payswarm.resource.listing.get(query, function(err, records) {
        if(err || records.length === 0) {
          err = new PaySwarmError(
            'The vendor that you are attempting to purchase something from ' +
            'has provided us with a bad asset listing. This is typically a ' +
            'problem with their e-commerce software. You may want to notify ' +
            'them of this issue.',
            MODULE_TYPE + '.InvalidListing', {
              listing: listingId,
              listingHash: listingHash,
              'public': true,
              httpStatusCode: 400
            }, err);
          return callback(err);
        }
        var listing = records.resources[0]['dc:source'];
        // check only one signature exists
        // FIXME: this is a poor constraint
        var signatures = jsonld.getValues(listing, 'sec:signature');
        if(signatures.length !== 1) {
          return callback(new PaySwarmError(
            'Listings must have exactly one signature.',
            MODULE_TYPE + '.InvalidSignatureCount', {
              listing: listingId,
              listingHash: listingHash
          }));
        }
        callback(null, listing);
      });
    },
    getAsset: ['getListing', function(callback, results) {
      var listing = results.getListing;
      var query = {
        id: listing['ps:asset'],
        hash: listing['ps:assetHash'],
        type: 'ps:Asset',
        strict: true,
        fetch: true
      };
      payswarm.resource.asset.get(query, function(err, records) {
        if(err || records.length === 0) {
          err = new PaySwarmError(
            'We could not find the information associated with the asset ' +
            'you were trying to purchase. This is typically a problem with ' +
            'the vendor\'s e-commerce software. You may want to notify ' +
            'them of this issue.',
            MODULE_TYPE + '.InvalidAsset', {
              asset: listing['ps:asset'],
              assetHash: listing['ps:assetHash'],
              'public': true,
              httpStatusCode: 400
            }, err);
          return callback(err);
        }
        var asset = records.resources[0]['dc:source'];
        // check only one signature exists
        // FIXME: this is a poor constraint
        var signatures = jsonld.getValues(asset, 'sec:signature');
        if(signatures.length !== 1) {
          return callback(new PaySwarmError(
            'Assets must have exactly one signature.',
            MODULE_TYPE + '.InvalidSignatureCount', {
            asset: listing['ps:asset'],
            assetHash: listing['ps:assetHash']
          }));
        }
        callback(null, asset);
      });
    }],
    checkDuplicate: ['getAsset', function(callback) {
      var options = {identity: results.getAcquirer['@id']};
      if('com:referenceId' in req.body) {
        options.referenceId = req.body['com:referenceId'];
      }
      else {
        options.asset = results.getAsset['@id'];
      }
      _checkDuplicate(req.user.profile, options, callback);
    }],
    handleDuplicate: ['checkDuplicate', function(callback, results) {
      // no duplicate found, continue
      if(!results.checkDuplicate) {
        return callback();
      }

      // duplicate found, return it in an error
      var contract = results.checkDuplicate;
      var nonce = null;
      if('sec:nonce' in req.body) {
        nonce = req.body['sec:nonce'];
      }
      _encryptShortContract(
        contract, contract['ps:listing']['sec:signature']['dc:creator'],
        nonce, function(err, encrypted) {
          if(err) {
            return callback(err);
          }
          callback(new PaySwarmError(
            'Duplicate purchase found.',
            MODULE_TYPE + '.DuplicatePurchase', {
              encryptedMessage: encrypted,
              // FIXME: send contract details for use in UI?
              contract: contract,
              httpStatusCode: 409,
              'public': true
            }));
        });
    }],
    createQuote: ['handleDuplicate', function(callback, results) {
      // create finalized contract
      var options = {
        listing: results.getListing,
        listingHash: req.body['ps:listingHash'],
        asset: results.getAsset,
        license: null,
        acquirer: results.getAcquirer,
        acquirerAccountId: req.body['com:source']
      };
      if('com:referenceId' in req.body) {
        options.referenceId = req.body['com:referenceId'];
      }
      payswarm.financial.createFinalizedContract(
        req.user.profile, options, callback);
    }]
  }, function(err, quote) {
    if(err) {
      return next(err);
    }
    // send quote
    res.json(quote);
  });
}

/**
 * Handles a request to process a Contract.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processContract(req, res, next) {
  return next(new PaySwarmError(
    'Not implemented.',
    MODULE_TYPE + '.NotImplemented'));
}

/**
 * Handles a request to process a Deposit.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processDeposit(req, res, next) {
  // deposit not signed, sign it for review
  if(!('sec:signature' in req.body)) {
    // build clean deposit
    var deposit = {
      '@type': req.body['@type'],
      'com:payee': req.body['com:payee'],
      'com:source': req.body['com:source']
    };

    // add IP address to deposit
    // FIXME: support ipv6
    var ip = payswarm.website.getRemoteAddress(req);
    deposit['ps:ipv4Address'] = ip;

    // sign the deposit for review
    return payswarm.financial.signDeposit(
      req.user.profile, deposit, function(err, signed) {
        if(err) {
          return next(err);
        }
        res.json(signed);
      });
  }

  // deposit already signed, process it
  payswarm.financial.processDeposit(
    req.user.profile, req.body, function(err, deposit) {
      if(err) {
        return next(err);
      }
      res.json(deposit, {'Location': deposit['@id']}, 201);
    });
}

/**
 * Handles a request to process a Withdrawal.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processWithdrawal(req, res, next) {
  return next(new PaySwarmError(
    'Not implemented.',
    MODULE_TYPE + '.NotImplemented'));
}

/**
 * Handles a request to process a PurchaseRequest.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processPurchaseRequest(req, res, next) {
  // finalized contract ID based on purchase request
  if('ps:transactionId' in req.body) {
    return _processPartialPurchaseRequest(req, res, next);
  }
  // automated budget-based purchase request
  _processAutoPurchaseRequest(req, res, next);
}

/**
 * Handles a request to process a PurchaseRequest that includes a
 * TransactionId for a previously cached Transaction quote.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processPartialPurchaseRequest(req, res, next) {
  // Web-based PurchaseRequest MUST contain:
  // transaction ID (for finalized contract), callback,
  // responseNonce (optional if callback is HTTPS, otherwise required)

  // FIXME: setup to alternatively use signature authentication
  // signed by identity == customer request

  async.auto({
    getContract: function(callback) {
      payswarm.financial.getCachedContract(
        req.user.profile, req.body['ps:transactionId'], callback);
    }
  });



  // FIXME: implement me
}

/**
 * Handles a request to process an automated PurchaseRequest.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processAutoPurchaseRequest(req, res, next) {
  // Automated budget-based PurchaseRequest MUST be signed and MUST contain:
  // listing ID, listing hash, NO callback, identity ID,
  // optional reference ID, NO responseNonce
  return next(new PaySwarmError(
    'Not implemented.',
    MODULE_TYPE + '.NotImplemented'));
}

/**
 * Handles a request to process a Transfer.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processTransfer(req, res, next) {
  return next(new PaySwarmError(
    'Not implemented.',
    MODULE_TYPE + '.NotImplemented'));
}

/**
 * Handles a request to get a PaymentForm.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getPaymentForm(req, res, next) {
  // FIXME: implement me
}

/**
 * Handles a request to get Transactions.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getTransactions(req, res, next) {
  // FIXME: implement me
}

/**
 * Checks for a duplicate Contract. There are several ways to check for
 * duplicates:
 *
 * 1. identity+referenceId
 * 2. identity+asset
 * 3. identity+asset+assetHash
 *
 * FIXME: Lower layers permit nearly any sort of check that combines
 * identity+asset + other parameters, however, this isn't implemented
 * here yet.
 *
 * identity: The ID of the Asset acquirer.
 * referenceId: The reference ID for the Contract.
 * asset: The ID of the Asset.
 * assetHash: The hash of the Asset.
 *
 * @param actor the Profile performing the check.
 * @param options the options check.
 * @param callback(err, contract) called once the operation completes.
 */
function _checkDuplicate(actor, options, callback) {
  // identity *must* be present
  var query = {identity: payswarm.db.hash(options.identity)};

  // do reference ID look up
  if('referenceId' in options) {
    query.referenceId = payswarm.db.hash(options.referenceId);
  }
  // do asset look up
  else if('asset' in options) {
    query.asset = payswarm.db.hash(options.asset);
    if(query.assetHash) {
      query['transaction.ps:listing.ps:assetHash'] = options.assetHash;
    }
  }
  else {
    return callback(new PaySwarmError(
      'Invalid duplicate Contract query.',
      MODULE_TYPE + '.InvalidDuplicateContractQuery'));
  }

  payswarm.financial.getTransactions(
    actor, query, {transaction: true}, {limit: 1}, function(err, record) {
      if(err) {
        return callback(err);
      }
      if(record) {
        return callback(null, record.transaction);
      }
      callback(null, null);
    });
}

/**
 * Encrypts a short-form Contract for delivery to the vendor.
 *
 * @param contract the Contract to encrypt.
 * @param providerKey the PublicKey ID for the Asset provider.
 * @param nonce the security nonce to use (or null).
 * @param callback(err, encrypted) called once the operation completes.
 */
function _encryptShortContract(contract, providerKey, nonce, callback) {
  // reframe data to a short contract
  var frame = payswarm.tools.getDefaultJsonLdFrames()['ps:Contract/Short'];
  if(!('@context' in contract)) {
    contract['@context'] = frame['@context'];
  }
  jsonld.frame(contract, frame, function(err, framed) {
    if(err) {
      return callback(err);
    }
    payswarm.identity.encryptMessage(
      framed, providerKey, nonce, callback);
  });
}
