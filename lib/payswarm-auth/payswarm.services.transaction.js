/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('jsonld');
var payswarm = {
  asset: require('./payswarm.resource'),
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  docs: require('./payswarm.docs'),
  events: require('./payswarm.events'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  profile: require('./payswarm.profile'),
  resource: require('./payswarm.resource'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools'),
  validation: require('./payswarm.validation'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var Money = require('./payswarm.money').Money;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
var validate = payswarm.validation.validate;
var getDefaultViewVars = payswarm.website.getDefaultViewVars;

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
  payswarm.docs.annotate.post(
      '/transactions [PurchaseRequest]',
      'services.transaction.postPurchaseRequest');
  app.server.post('/transactions', ensureAuthenticated,
    function(req, res, next) {
      if(req.query.quote === 'true') {
        return validate('services.transaction.postQuote')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _processQuote(req, res, next);
        });
      }
      if(jsonld.hasValue(req.body, 'type', 'ps:Contract')) {
        return validate('services.transaction.postContract')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _processContract(req, res, next);
          });
      }
      if(jsonld.hasValue(req.body, 'type', 'com:Deposit')) {
        return validate('services.transaction.postDeposit')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _processDeposit(req, res, next);
          });
      }
      if(jsonld.hasValue(req.body, 'type', 'com:Withdrawal')) {
        return validate('services.transaction.postWithdrawal')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _processWithdrawal(req, res, next);
          });
      }
      if(jsonld.hasValue(req.body, 'type', 'ps:PurchaseRequest')) {
        return validate('services.transaction.postPurchaseRequest')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _processPurchaseRequest(req, res, next);
          });
      }
      if(jsonld.hasValue(req.body, 'type', 'com:Transfer')) {
        return validate('services.transaction.postTransfer')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _processTransfer(req, res, next);
          });
      }
      next(new PaySwarmError(
        'Invalid transaction type.', MODULE_TYPE + '.InvalidTransactionType'));
  });

  payswarm.docs.annotate.get(
    '/transactions/:id',
    'services.transaction.getTransaction');
  app.server.get('/transactions/:id', ensureAuthenticated, function(req, res, next) {
    var transactionId = payswarm.financial.createTransactionId(req.params.id);
    async.auto({
      getTransaction: function(callback) {
        payswarm.financial.getTransaction(
          req.user.profile, transactionId, function(err, transaction, meta) {
            callback(err, transaction);
          });
      },
      getVars: function(callback) {
        getDefaultViewVars(req, callback);
      },
      render: ['getTransaction', 'getVars', function(callback, results) {
        var vars = results.getVars;
        vars.transaction = results.getTransaction;
        if(jsonld.hasValue(vars.transaction, 'type', 'ps:Contract')) {
          vars.asset = vars.transaction.asset.resource;
          vars.license = vars.transaction.license.resource;
          vars.transfers = vars.transaction.transfer;
          vars.isContract = true;
        }
        else if(jsonld.hasValue(vars.transaction, 'type', 'com:Deposit')) {
          vars.transfers = vars.transaction.transfer;
          vars.isDeposit = true;
        }

        res.render('transaction.tpl', vars);
      }]
    }, function(err) {
      if(err) {
        next(err);
      }
    });
  });

  app.server.get('/transactions', ensureAuthenticated,
    function(req, res, next) {
      if(req.query.form === 'pay') {
        return _getPaymentForm(req, res, next);
      }
      _getTransactions(req, res, next);
  });

  // FIXME: change URL
  app.server.get('/financial/activity', ensureAuthenticated,
    function(req, res, next) {
      // use last 30 days of transactions as default starting date
      var end = new Date();
      var start = new Date(+end - 1000*60*60*24*30);

      if(req.query.dtstart) {
        // parse dtstart seconds
        var dtstart = parseInt(req.query.dtstart);
        if(dtstart !== NaN) {
          start = new Date(1000 * dtstart);
        }
      }
      if(req.query.dtend) {
        // parse dtend seconds
        var dtend = parseInt(req.query.dtend);
        if(dtend !== NaN) {
          end = new Date(1000 * dtend);
        }
      }

      // start building query
      var query = {created: {$gte: start, $lte: end}};

      async.auto({
        getAccount: function(callback) {
          // search by individual account
          if(req.query.account) {
            // retrieve account to ensure its owned by profile and valid, etc.
            return payswarm.financial.getAccount(
              req.user.profile, req.query.account, function(err, account) {
                callback(err, account);
              });
          }
          callback(null, null);
        },
        getVars: function(callback) {
          getDefaultViewVars(req, callback);
        },
        getTransactions: ['getAccount', function(callback, results) {
          if(results.getAccount) {
            var hash = payswarm.db.hash(results.getAccount.id);
            query.$or = [{source: hash}, {destination: hash}];
          }
          else {
            // use identity
            if(!req.user.identity) {
              // no transactions
              query = null;
            }
            else {
              query.identity = payswarm.db.hash(req.user.identity.id);
            }
          }

          // run query
          if(query) {
            payswarm.financial.getTransactions(
              req.user.profile, query, {},
              {sort: {created: -1}, limit: 30}, callback);
          }
          else {
            callback(null, []);
          }
        }],
        render: ['getTransactions', 'getVars', function(callback, results) {
          // FIXME: hack this to fix old pagination for the time being
          // it isn't actually correct
          var vars = results.getVars;
          var records = results.getTransactions;
          vars.transactions = {
            resources:[],
            start: 0,
            num: records.length,
            total: records.length,
            begin: payswarm.tools.w3cDate(start),
            end: payswarm.tools.w3cDate(end)
          };
          records.forEach(function(record) {
            vars.transactions.resources.push(record.transaction);
          });
          if(results.getAccount) {
            vars.transactions.account = results.getAccount;
          }
          _setupPagingVariables(vars.transactions, vars.transactions);
          res.render('accounts-activity.tpl', vars);
        }]
      }, function(err) {
        if(err) {
          next(err);
        }
      });
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
function _processQuote(req, res, next) {
  var options = {
    requester: req.user.identity,
    listing: req.body.listing,
    listingHash: req.body.listingHash,
    source: req.body.source,
    cache: true
  };
  if('referenceId' in req.body) {
    options.referenceId = req.body.referenceId;
  }
  if('nonce' in req.body) {
    options.nonce = req.body.nonce;
  }
  _generateQuote(req.user.profile, options, function(err, contract) {
    if(err) {
      return next(err);
    }
    // send quote
    res.json(contract);
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
  if(!('signature' in req.body)) {
    // build clean deposit
    var deposit = {
      type: req.body.type,
      payee: req.body.payee,
      source: req.body.source
    };

    // add IP address to deposit
    // FIXME: support ipv6
    deposit.ipv4Address = req.ip;

    // sign the deposit for review
    return payswarm.financial.signDeposit(
      req.user.profile, deposit, function(err, signed) {
        if(err) {
          return next(err);
        }
        signed['@context'] = payswarm.tools.getDefaultJsonLdContextUrl();
        res.json(signed);
      });
  }

  // deposit already signed, process it
  payswarm.financial.processDeposit(
    req.user.profile, req.body, {request: req}, function(err, deposit) {
      if(err) {
        return next(err);
      }
      res.set('Location', deposit.id);
      res.json(201, deposit);
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
  if('transactionId' in req.body) {
    return _processPartialPurchaseRequest(req, res, next);
  }
  _processSignedPurchaseRequest(req, res, next);
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
  // transaction ID (for finalized contract),
  // nonce (optional if registered callback is HTTPS, otherwise required)

  // FIXME: setup to alternatively use signature authentication
  // signed by identity == customer request ... and, in that case,
  // set require budget below to false

  async.auto({
    getContract: function(callback) {
      payswarm.financial.getCachedContract(
        req.user.profile, req.body.transactionId, callback);
    },
    processContract: ['getContract', function(callback, results) {
      var options = {
        contract: results.getContract,
        allowBudget: true,
        requireBudget: false
      };
      if('nonce' in req.body) {
        options.nonce = req.body.nonce;
      }
      _processFinalizedContract(req.user.profile, options, callback);
    }],
    encryptReceipt: ['processContract', function(callback, results) {
      var nonce = null;
      if('nonce' in req.body) {
        nonce = req.body.nonce;
      }
      _encryptReceipt(results.processContract, nonce, callback);
    }],
    emailReceipt: ['processContract', function(callback, results) {
      _emailReceipt(results.processContract, callback);
    }]
  }, function(err, results) {
    if(err) {
      return next(err);
    }

    // respond with encrypted receipt
    var encrypted = results.encryptReceipt;
    var contractId = results.processContract.id;
    res.set('Location', contractId);
    res.json(201, encrypted);
  });
}

/**
 * Handles a request to process a signed PurchaseRequest.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processSignedPurchaseRequest(req, res, next) {
  // PurchaseRequest MUST be signed and MUST contain:
  // identity ID, listing ID, listing hash, NO callback,
  // optional reference ID, NO nonce

  /* Note: If nonce or callback are present then it is possible that this
     call was made accidentally by faulty client software. It may mean that
     a vendor-signed purchase request was forwarded to a buyer's browser to
     be submitted. This information should never be given to a buyer, and
     may also have been transmitted over a non-secure channel (HTTP) because
     this is permissible for non-vendor-initiated purchase requests that
     look like the one detected here. While this purchase request could
     technically be processed, do not do so because its transmission might
     indicate that there is a problem with the vendor's client software that
     could lead to a security risk for the vendor. Instead, raise an error to
     notify them. */
  if(('nonce' in req.body) || ('callback' in req.body)) {
    return next(new PaySwarmError(
      'The purchase request was rejected because it included ' +
      'security parameters that must not be sent when performing a ' +
      'vendor-initiated purchase. Please ensure that your e-commerce ' +
      'software is functioning properly to avoid any potential security risk.',
      MODULE_TYPE + '.InvalidParameters', {
        'public': true,
        httpStatusCode: 400
      }));
  }

  /* Note: If purchase request was authorized by the asset acquirer, then
   the request may include an account ID, otherwise it must be
   authorized by the asset provider and a budget look up will be performed. */
  var options = {
    requester: req.user.identity.id,
    acquirer: req.body.identity,
    listing: req.body.listing,
    listingHash: req.body.listingHash,
    cache: false
  };
  if('referenceId' in req.body) {
    options.referenceId = req.body.referenceId;
  }

  if(req.body.source) {
    // if purchase request is not by the acquirer, prohibit source account
    if(options.requester !== options.acquirer) {
      return next(new PaySwarmError(
        'A source FinancialAccount may only be provided if the Asset ' +
        'acquirer made the purchase request.',
        MODULE_TYPE + '.InvalidParameter', {
          requester: options.requester,
          acquirer: options.acquirer
        }));
    }
    options.source = req.body.source;
  }

  // require a budget if no source financial account provided
  var requireBudget = !options.source;

  async.waterfall([
    function(callback) {
      _generateQuote(req.user.profile, options, callback);
    },
    function(contract, callback) {
      _processFinalizedContract(
        req.user.profile, {
          contract: contract,
          allowBudget: true,
          requireBudget: requireBudget
        }, callback);
    },
    function(contract, callback) {
      _getReceipt(contract, callback);
    }
  ], function(err, receipt) {
    if(err) {
      return next(err);
    }

    // send created
    res.set('Location', receipt.id);
    res.json(201, receipt);
  });
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
  // FIXME: profile has no default identity, this is an error,
  // go to a page where they can create an identity
  if(!req.user.identity) {
    return res.redirect('/profile/settings');
  }

  async.waterfall([
    function(callback) {
      getDefaultViewVars(req, callback);
    },
    function(vars, callback) {
      // create data for UI
      var data = vars.clientData;
      data.identity = req.user.identity.id;
      data.listing = req.query.listing;
      data.listingHash = req.query['listing-hash'];
      data.gateway = payswarm.config.financial.defaults.gateway;
      data.allowDuplicatePurchases =
        data.paymentDefaults.allowDuplicatePurchases;

      // optional data
      if('reference-id' in req.query) {
        data.referenceId = req.query['reference-id'];
      }
      if('callback' in req.query) {
        data.callback = req.query.callback;
      }
      if('response-nonce' in req.query) {
        data.nonce = req.query['response-nonce'];
      }

      // render view
      res.render('pay.tpl', vars);
    }
  ], function(err) {
    if(err) {
      return next(err);
    }
  });
}

/**
 * Parses a string of seconds into a date.
 *
 * @param secs the seconds.
 *
 * @return the Date or null on parse error.
 */
function _parseSeconds(secs) {
  secs = parseInt(secs);
  return isNaN(secs) ? null : new Date(1000 * secs);
}

/**
 * Handles a request to get Transactions.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getTransactions(req, res, next) {
  // create default query options
  var options = {
    createdStart: _parseSeconds(req.query.createdStart) || new Date(),
    createdEnd: _parseSeconds(req.query.createdEnd) || null,
    account: req.query.account || null,
    previous: req.query.previous || null,
    limit: Math.abs(Math.min(30, req.query.limit || 30))
    // FIXME: implement other query vars
  };

  // start building query
  var query = {created: {$lte: options.createdStart}};
  if(options.createdEnd !== null) {
    query.created.$gte = options.createdEnd;
  }

  async.waterfall([
    function(callback) {
      if(options.account) {
        // retrieve account to ensure its owned by profile and valid, etc.
        return payswarm.financial.getAccount(
          req.user.profile, options.account, function(err, account) {
            callback(err, account);
          });
      }
      callback(null, null);
    },
    function(account, callback) {
      if(account) {
        var hash = payswarm.db.hash(account.id);
        query.$or = [{source: hash}, {destination: hash}];
      }
      else {
        // use identity
        if(!req.user.identity) {
          // no transactions
          query = null;
        }
        else {
          query.identity = payswarm.db.hash(req.user.identity.id);
        }
      }

      // run query
      if(query) {
        var opts = {sort: {created: -1, id: 1}, limit: options.limit};
        if(options.previous !== null) {
          opts.min = {id: payswarm.db.hash(options.previous)};
          opts.skip = 1;
        }
        payswarm.financial.getTransactions(
          req.user.profile, query, {transaction: true}, opts, callback);
      }
      else {
        callback(null, []);
      }
    },
    function(records, callback) {
      var txns = [];
      records.forEach(function(record) {
        // FIXME: make general function for @context to url?
        var txn = record.transaction;
        var contextUrl = payswarm.tools.getDefaultJsonLdContextUrl();
        txn['@context'] = contextUrl;
        if('asset' in txn) {
          txn.asset['@context'] = contextUrl;
        }
        if('license' in txn) {
          txn.license['@context'] = contextUrl;
        }
        if('listing' in txn) {
          txn.listing['@context'] = contextUrl;
        }
        txns.push(txn);
      });
      res.json(txns);
    }
  ], function(err) {
    if(err) {
      next(err);
    }
  });
}

/**
 * Generates a Contract quote (a finalized Contract).
 *
 * @param actor the Profile performing the action.
 * @param options the options to use.
 *          requester the identity requesting the quote (vendor or customer).
 *          listing the listing ID.
 *          listingHash the listing hash.
 *          [acquirer] the asset acquirer (must be present if source is not).
 *          [source] the source account to use, use a budget if not present.
 *          [referenceId] the reference ID.
 *          [nonce] the nonce to use to encrypt duplicate contracts.
 *          [cache]: true to cache the contract for later retrieval
 *            (default: false).
 * @param callback(err, contract) called once the operation completes.
 */
function _generateQuote(actor, options, callback) {
  async.auto({
    getAcquirer: function(callback) {
      if(options.acquirer && !options.source) {
        return callback(null, options.acquirer);
      }

      // no way to look up acquirer w/o source
      if(!options.acquirer && !options.source) {
        return callback(new PaySwarmError(
          'Neither the Asset acquirer or source FinancialAccount were ' +
          'provided.',
          MODULE_TYPE + '.InvalidParameter'));
      }

      // get acquirer based on source account owner
      payswarm.financial.getAccount(actor, options.source,
        function(err, account) {
          if(!err && options.acquirer && options.acquirer !== account.owner) {
            err = new PaySwarmError(
              'The Asset acquirer does not have permission to use the ' +
              'FinancialAccount selected to provide payment for the Asset.',
              MODULE_TYPE + '.PermissionDenied', {
                acquirer: options.acquirer,
                source: account.id
              });
          }
          if(err) {
            return callback(err);
          }
          callback(null, account.owner);
        });
    },
    getListing: function(callback) {
      var query = {
        id: options.listing,
        hash: options.listingHash,
        type: 'ps:Listing',
        store: true,
        strict: true,
        fetch: true
      };
      payswarm.resource.listing.get(query, function(err, records) {
        if(err) {
          err = new PaySwarmError(
            'The vendor that you are attempting to purchase something from ' +
            'has provided us with a bad asset listing. This is typically a ' +
            'problem with their e-commerce software. You may want to notify ' +
            'them of this issue.',
            MODULE_TYPE + '.InvalidListing', {
              listing: options.listing,
              listingHash: options.listingHash,
              'public': true,
              httpStatusCode: 400
            }, err);
          return callback(err);
        }
        var listing = records[0].resource;
        // check only one signature exists
        // FIXME: this is a poor constraint
        var signatures = jsonld.getValues(listing, 'signature');
        if(signatures.length !== 1) {
          return callback(new PaySwarmError(
            'Listings must have exactly one signature.',
            MODULE_TYPE + '.InvalidSignatureCount', {
              listing: options.listing,
              listingHash: options.listingHash
          }));
        }
        callback(null, listing);
      });
    },
    getAsset: ['getListing', function(callback, results) {
      var listing = results.getListing;
      var query = {
        id: listing.asset,
        hash: listing.assetHash,
        type: 'ps:Asset',
        strict: true,
        fetch: true
      };
      payswarm.resource.asset.get(query, function(err, records) {
        if(err) {
          err = new PaySwarmError(
            'We could not find the information associated with the asset ' +
            'you were trying to purchase. This is typically a problem with ' +
            'the vendor\'s e-commerce software. You may want to notify ' +
            'them of this issue.',
            MODULE_TYPE + '.InvalidAsset', {
              asset: listing.asset,
              assetHash: listing.assetHash,
              'public': true,
              httpStatusCode: 400
            }, err);
          return callback(err);
        }
        var asset = records[0].resource;
        // check only one signature exists
        // FIXME: this is a poor constraint
        var signatures = jsonld.getValues(asset, 'signature');
        if(signatures.length !== 1) {
          return callback(new PaySwarmError(
            'Assets must have exactly one signature.',
            MODULE_TYPE + '.InvalidSignatureCount', {
            asset: listing.asset,
            assetHash: listing.assetHash
          }));
        }
        callback(null, asset);
      });
    }],
    getBudget: ['getAcquirer', 'getAsset', function(callback, results) {
      // if source account is given, do not use budget
      if(options.source) {
        return callback(null, null);
      }

      // authorizing identity (requester) *must* be the provider or acquirer
      var asset = results.getAsset;
      if(options.requester !== asset.assetProvider &&
        options.requester !== results.getAcquirer) {
        return callback(new PaySwarmError(
          'The purchase request was not authorized by the Asset provider ' +
          'or Asset acquirer.',
          MODULE_TYPE + '.PermissionDenied'));
      }

      // try to find matching budget
      _getBudget(results.getAcquirer, asset.assetProvider,
        function(err, budget) {
          // no budget found and no source account provided
          if(!err && !budget) {
            err = new PaySwarmError(
              'No source FinancialAccount given and no applicable budget ' +
              'found for the given Contract.',
              MODULE_TYPE + '.BudgetNotFound');
          }
          options.source = budget.source;
          return callback(err, budget);
      });
    }],
    checkDuplicate: ['getBudget', function(callback, results) {
      var opts = {identity: results.getAcquirer};
      if('referenceId' in options) {
        opts.referenceId = options.referenceId;
      }
      else {
        opts.asset = results.getAsset.id;
      }
      _checkDuplicate(actor, opts, callback);
    }],
    handleDuplicate: ['checkDuplicate', function(callback, results) {
      // no duplicate found, continue
      if(!results.checkDuplicate) {
        return callback();
      }
      var opts = {query: results.checkDuplicate};
      if('nonce' in options) {
        opts.nonce = options.nonce;
      }
      _createDuplicateError(actor, opts, callback);
    }],
    createQuote: ['handleDuplicate', function(callback, results) {
      // create finalized contract
      var opts = {
        listing: results.getListing,
        listingHash: options.listingHash,
        asset: results.getAsset,
        license: null,
        acquirer: results.getAcquirer,
        acquirerAccountId: options.source
      };
      if('referenceId' in options) {
        opts.referenceId = options.referenceId;
      }
      if('cache' in options) {
        opts.cache = options.cache;
      }
      payswarm.financial.createFinalizedContract(actor, opts, callback);
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    callback(null, results.createQuote);
  });
}

/**
 * Processes a finalized contract.
 *
 * @param actor the Profile performing the action.
 * @param options the options.
 *          contract the finalized contract.
 *          [allowBudget] true to allow the use of a budget, false not to.
 *          [requireBudget] true to require a budget, false not to.
 *          [nonce] the nonce to use to encrypt duplicate a contract if found.
 * @param callback(err, contract) called once the operation completes.
 */
function _processFinalizedContract(actor, options, callback) {
  async.auto({
    getBudget: function(callback, results) {
      if(!options.allowBudget) {
        return callback(null, null);
      }

      // get budget based on acquirer ID and asset provider
      var contract = options.contract;
      var acquirerId = contract.assetAcquirer.id;
      var asset = contract.asset;
      _getBudget(acquirerId, asset.assetProvider, function(err, budget) {
        if(err) {
          return callback(err);
        }
        if(!budget) {
          if(options.requireBudget) {
            err = new PaySwarmError(
              'No applicable budget found for the given Contract.',
              MODULE_TYPE + '.BudgetNotFound');
          }
          return callback(err, null);
        }
        if(budget.source !== contract.transfer[0].source) {
          err = new PaySwarmError(
            'The source FinancialAccount in the Contract does not match ' +
            'the budget associated with the Vendor.',
            MODULE_TYPE + '.MismatchedBudget');
        }
        callback(err, budget);
      });
    },
    updateBudget: ['getBudget', function(callback, results) {
      var budget = results.getBudget;
      if(budget) {
        // subtract contract amount from the budget
        var amount = new Money(options.contract.amount);
        amount = amount.setNegative(true);
        return payswarm.financial.updateBudgetBalance(
          actor, budget.id, amount, callback);
      }
      // no budget
      callback();
    }],
    processContract: ['updateBudget', function(callback, results) {
      var contract = options.contract;

      // create duplicate query
      var acquirerId = contract.assetAcquirer.id;
      var query = {identity: payswarm.db.hash(acquirerId)};

      // do reference ID look up
      if('referenceId' in contract) {
        query.referenceId = payswarm.db.hash(contract.referenceId);
      }
      // do asset look up
      else {
        query.asset = payswarm.db.hash(contract.asset.id);
      }

      // attempt to process contract
      payswarm.financial.processContract(
        actor, contract, query, function(err) {
          if(!err) {
            return callback(null, contract);
          }
          // failure case
          async.waterfall([
            // handle budget
            function(callback) {
              // no budget to fix
              var budget = results.getBudget;
              if(!budget) {
                return callback();
              }
              // attempt to put contract amount back onto budget
              var amount = new Money(contract.amount);
              payswarm.financial.updateBudgetBalance(
                actor, budget.id, amount, callback);
            },
            function(callback) {
              // handle duplicate contract
              if(err.name === 'payswarm.financial.DuplicateTransaction') {
                var opts = {query: query};
                if('nonce' in options) {
                  opts.nonce = options.nonce;
                }
                return _createDuplicateError(actor, opts, callback);
              }
              // return original error
              callback(err);
            }
          ], callback);
        });
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    callback(null, results.processContract);
  });
}

/**
 * Gets the Budget associated with the given Vendor and Asset acquirer.
 *
 * @param vendor the Identity of the Vendor.
 * @param acquirer the Identity of the Asset acquirer.
 * @param callback(err, budget) called once the operation completes.
 */
function _getBudget(acquirer, vendor, callback) {
  var query = {
    owner: payswarm.db.hash(acquirer),
    vendors: payswarm.db.hash(vendor)
  };
  payswarm.financial.getBudgets(null, query, function(err, records) {
    if(err) {
      return callback(err);
    }
    if(records.length === 0) {
      return callback(null, null);
    }
    // return first budget (can only be one owner+vendor pair)
    callback(null, records[0].budget);
  });
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
 * If a duplicate Contract is found, then the query used is returned via
 * the callback, otherwise null is.
 *
 * @param actor the Profile performing the check.
 * @param options the options check.
 * @param callback(err, query) called once the operation completes.
 */
function _checkDuplicate(actor, options, callback) {
  // identity *must* be present, must not be pending or voided
  var query = {
    identity: payswarm.db.hash(options.identity),
    state: {$ne: {$or: ['pending','voiding', 'voided']}}
  };

  // do reference ID look up
  if('referenceId' in options) {
    query.referenceId = payswarm.db.hash(options.referenceId);
  }
  // do asset look up
  else if('asset' in options) {
    query.asset = payswarm.db.hash(options.asset);
    if(query.assetHash) {
      query['transaction.listing.assetHash'] = options.assetHash;
    }
  }
  else {
    return callback(new PaySwarmError(
      'Invalid duplicate Contract query.',
      MODULE_TYPE + '.InvalidDuplicateContractQuery'));
  }

  payswarm.financial.hasContract(actor, query, function(err, exists) {
    if(err) {
      return callback(err);
    }
    callback(null, exists ? query : null);
  });
}

/**
 * Creates a duplicate Contract error based on the given query. It is assumed
 * that the query has already been run and has detected a duplicate. The
 * callback will always be passed an error.
 *
 * @param actor the Profile performing the action.
 * @param options the options to use:
 *          query the duplicate query.
 *          [nonce] the nonce to use to encrypt the duplicate contract.
 * @param callback(err) called once the operation completes.
 */
function _createDuplicateError(actor, options, callback) {
  var query = options.query;

  // get a matching contract
  payswarm.financial.getTransactions(
    actor, query, {transaction: true}, {limit: 1}, function(err, records) {
      if(err) {
        return callback(err);
      }
      if(records.length === 0) {
        return callback(new PaySwarmError(
          'No duplicate Contract found when expecting one.',
          MODULE_TYPE + '.NoDuplicateContract'));
      }

      // get duplicate contract
      var contract = records[0].transaction;

      // no nonce, return error w/out encrypted message
      if(!('nonce' in options)) {
        return callback(new PaySwarmError(
          'Duplicate purchase found.',
          MODULE_TYPE + '.DuplicatePurchase', {
            // FIXME: send contract details for use in UI?
            contract: contract,
            httpStatusCode: 409,
            'public': true
          }));
      }

      // nonce, encrypt message
      _encryptReceipt(contract, options.nonce, function(err, encrypted) {
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
    });
}

/**
 * Gets a Receipt for a Contract.
 *
 * @param contract the related Contract.
 * @param callback(err, signed) called once the operation completes.
 */
function _getReceipt(contract, callback) {
  async.auto({
    frame: function(callback) {
      // FIXME: change this to a Receipt
      // reframe data to a short contract
      var frame = payswarm.tools.getDefaultJsonLdFrames()['ps:Contract/Short'];
      if(!('@context' in contract)) {
        contract['@context'] = frame['@context'];
      }
      jsonld.frame(contract, frame, callback);
    },
    getAuthorityKeys: function(callback) {
      // get authority keys without permission check
      payswarm.identity.getAuthorityKeyPair(
        null, function(err, publicKey, privateKey) {
          callback(err, {publicKey: publicKey, privateKey: privateKey});
        });
    },
    sign: ['frame', 'getAuthorityKeys', function(callback, results) {
      var privateKey = results.getAuthorityKeys.privateKey;
      var publicKey = results.getAuthorityKeys.publicKey;
      var context = results.frame['@context'];
      var result = results.frame['@graph'][0];
      result['@context'] = context;
      payswarm.security.signJsonLd(result, privateKey, publicKey.id, callback);
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    callback(null, results.sign);
  });
}

/**
 * Emails a receipt of the purchase to the buyer.
 *
 * @param contract the processed contract.
 * @param callback(err, emailSuccessful) called once the operation completes.
 */
function _emailReceipt(contract, callback) {
  var assetAcquirer = contract.assetAcquirer.id;

  async.waterfall([
    function(callback) {
      payswarm.identity.getIdentity(null, assetAcquirer, callback);
    },
    function(identity, meta, callback) {
      payswarm.profile.getProfile(null, identity.owner, callback);
    },
    function(profile, meta, callback) {
      // send a purchase success event
      payswarm.events.emit('payswarm.common.Purchase.success', {
        type: 'payswarm.common.Purchase.success',
        details: {profile: profile, contract: contract}
      });

      callback();
    }
  ], callback);
}

/**
 * Encrypts a Receipt for delivery to the vendor.
 *
 * @param contract the related Contract.
 * @param nonce the security nonce to use (or null).
 * @param callback(err, encrypted) called once the operation completes.
 */
function _encryptReceipt(contract, nonce, callback) {
  // get vendor key from listing signature
  var vendorKey = contract.listing.signature.creator;

  // FIXME: change this to a Receipt
  // reframe data to a short contract
  var frame = payswarm.tools.getDefaultJsonLdFrames()['ps:Contract/Short'];
  if(!('@context' in contract)) {
    contract['@context'] = frame['@context'];
  }
  jsonld.frame(contract, frame, function(err, framed) {
    if(err) {
      return callback(err);
    }
    var context = framed['@context'];
    var result = framed['@graph'][0];
    result['@context'] = context;
    payswarm.identity.encryptMessage(result, vendorKey, nonce, callback);
  });
}

// does pagination for account activity for the time being
function _setupPagingVariables(rset, out) {
  var start = rset.start;
  var num = rset.num;
  var setLength = rset.resources.length;

  // Total *known* resources. May be less than real total if ResourceSet
  // didn't specify total and "more" flag set.
  var totalKnown;
  var pages = 0;
  if('total' in rset) {
    totalKnown = rset.total;
    out.more = false;
  }
  else {
    totalKnown = start + setLength;
    var more = !!rset.more;
    out.more = more;
    if(more) {
      // there is at least one more resource
      ++totalKnown;
    }
  }

  if(totalKnown > 0 && num > 0) {
    pages = Math.floor(totalKnown / num);
    if(totalKnown > (pages * num)) {
      // there were spillover results to the next page, add a page
      ++pages;
    }

    // get paging page start and end
    // set a fuzzy window on the results: +/-2 or 3 if near start/end.
    var page = Math.floor(start / num) + 1;
    var pageStart = (page <= 4) ? 1 : (page - 2);
    var pageEnd = ((pages - page + 1) <= 4) ? pages : (page + 2);

    // get start and end results
    var startResult = start + 1;
    var endResult = page * num;
    endResult = Math.min(totalKnown, endResult);

    // set paging data
    out.page = page;
    var hasPrev = (page !== 1);
    out.hasPrev = hasPrev;
    if(hasPrev) {
      out.pagePrev = page - 1;
    }
    var hasNext = (page !== pages);
    out.hasNext = hasNext;
    if(hasNext) {
      out.pageNext = page + 1;
    }
    out.pageStart = pageStart;
    out.pageEnd = pageEnd;
    out.resPerPage = num;
    out.resStart = startResult;
    out.resEnd = endResult;
  }
  out.pages = pages;
  out.total = totalKnown;

  // create array of pages
  out.pageNumbers = [];
  for(var i = out.pageStart; i < out.pageEnd + 1; ++i) {
    out.pageNumbers.push(i);
  }

  // add delta start and end times if given
  if('begin' in rset) {
    out.dtstart = Math.floor(+rset.begin / 1000);
  }
  if('end' in rset) {
    out.dtend = Math.floor(+rset.end / 1000);
  }
}
