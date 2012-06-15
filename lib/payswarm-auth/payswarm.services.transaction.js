/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('jsonld');
var payswarm = {
  asset: require('./payswarm.resource'),
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
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
  app.server.post('/transactions', ensureAuthenticated,
    function(req, res, next) {
      if(req.query.quote === 'true') {
        return validate('services.transaction.postTransactionsQuote')(
          req, res, function(err) {
            if(err) {
              return next(err);
            }
            _postTransactionsQuote(req, res, next);
        });
      }
      return validate('services.transaction.postTransactions')(
        req, res, function(err) {
          if(err) {
            return next(err);
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
          // FIXME: make service validator catch other types
          _processTransfer(req, res, next);
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
      // FIXME: why doesn't this query work?
      //var query = {date: {$gte: start, $lte: end}};
      var query = {};

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
        getTransactions: ['getAccount', 'getVars', function(callback, results) {
          var vars = results.getVars;
          if(results.getAccount) {
            var hash = payswarm.db.hash(results.getAccount['@id']);
            query.$or = [{source: hash}, {destination: hash}];
          }
          else {
            // use identity
            if(!req.user.identity) {
              // no transactions
              query = null;
            }
            else {
              query.identity = payswarm.db.hash(req.user.identity['@id']);
            }
          }

          // run query
          if(query) {
            payswarm.financial.getTransactions(
              req.user.profile, query, {},
              {sort: {date: -1}, limit: 30}, callback);
          }
          else {
            callback(null, []);
          }
        }],
        render: ['getTransactions', function(callback, results) {
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
          for(var i in records) {
            vars.transactions.resources.push(records[i].transaction);
          }
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
              listing: req.body['ps:Listing'],
              listingHash: req.body['ps:listingHash'],
              'public': true,
              httpStatusCode: 400
            }, err);
          return callback(err);
        }
        var listing = records[0].resource;
        // check only one signature exists
        // FIXME: this is a poor constraint
        var signatures = jsonld.getValues(listing, 'sec:signature');
        if(signatures.length !== 1) {
          return callback(new PaySwarmError(
            'Listings must have exactly one signature.',
            MODULE_TYPE + '.InvalidSignatureCount', {
              listing: req.body['ps:listing'],
              listingHash: req.body['ps:listingHash']
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
        var asset = records[0].resource;
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
    checkDuplicate: ['getAcquirer', 'getAsset', function(callback, results) {
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
      var nonce = null;
      if('sec:nonce' in req.body) {
        nonce = req.body['sec:nonce'];
      }
      _createDuplicateError(
        req.user.profile, results.checkDuplicate, nonce, callback);
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
  }, function(err, results) {
    if(err) {
      return next(err);
    }
    // send quote
    res.json(results.createQuote);
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
    },
    getBudget: ['getContract', function(callback, results) {
      // get budget based on acquirer ID and asset provider
      var contract = results.getContract;
      var acquirerId = contract['ps:assetAcquirer']['@id'];
      var asset = contract['ps:asset'];
      var query = {
        owner: payswarm.db.hash(acquirerId),
        vendors: payswarm.db.hash(asset['ps:assetProvider'])
      };
      payswarm.financial.getBudgets(null, query, function(err, records) {
        if(err) {
          return callback(err);
        }
        if(records.length > 0) {
          // get first budget (can only be one owner+vendor pair)
          var budget = records[0].budget;
          var transfers = jsonld.getValues(contract, 'com:transfer');
          if(budget['com:account'] !== transfers[0]['com:source']) {
            return callback(new PaySwarmError(
              'The source FinancialAccount in the Contract does not match ' +
              'the budget associated with the Vendor.',
              MODULE_TYPE + '.MismatchedBudget'));
          }
          callback(null, budget);
        }
        callback(null, null);
      });
    }],
    updateBudget: ['getBudget', function(callback, results) {
      var budget = results.getBudget;
      if(budget) {
        // subtract contract amount from the budget
        var amount = new Money(results.getContract['com:amount']);
        amount = amount.setNegative(true);
        return payswarm.financial.updateBudgetBalance(
          req.user.profile, budget['@id'], amount, callback);
      }
      // no budget
      callback();
    }],
    processContract: ['updateBudget', function(callback, results) {
      var contract = results.getContract;

      // create duplicate query
      var acquirerId = contract['ps:assetAcquirer']['@id'];
      var query = {identity: payswarm.db.hash(acquirerId)};

      // do reference ID look up
      if('com:referenceId' in contract) {
        query.referenceId = payswarm.db.hash(contract['com:referenceId']);
      }
      // do asset look up
      else {
        var asset = contract['ps:asset'];
        query.asset = payswarm.db.hash(asset['@id']);
      }

      // attempt to process contract
      payswarm.financial.processContract(
        req.user.profile, contract, query, function(err) {
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
              var amount = new Money(contract['com:amount']);
              payswarm.financial.updateBudgetBalance(
                req.user.profile, budget['@id'], amount, callback);
            },
            // handle duplicate contract
            function(callback) {
              // handle duplicate contract
              if(err.name === 'payswarm.financial.DuplicateTransaction') {
                var nonce = null;
                if('sec:nonce' in req.body) {
                  nonce = req.body['sec:nonce'];
                }
                return _createDuplicateError(
                  req.user.profile, query, nonce, callback);
              }
              callback(err);
            }
          ], callback);
        });
    }],
    encryptContract: ['processContract', function(callback, results) {
      var nonce = null;
      if('sec:nonce' in req.body) {
        nonce = req.body['sec:nonce'];
      }
      _encryptShortContract(results.processContract, nonce, callback);
    }]
  }, function(err, results) {
    if(err) {
      return next(err);
    }

    // send created
    var encrypted = results.encryptContract;
    var contractId = results.processContract['@id'];
    res.json(encrypted, {'Location': contractId}, 201);
  });
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
      data.identity = req.user.identity['@id'];
      data['ps:listing'] = req.query.listing;
      data['ps:listingHash'] = req.query['listing-hash'];
      data.gateway = payswarm.config.financial.defaults.gateway;
      data.allowDuplicatePurchases =
        data.paymentDefaults.allowDuplicatePurchases;

      // optional data
      if('reference-id' in req.query) {
        data['com:referenceId'] = req.query['reference-id'];
      }
      if('callback' in req.query) {
        data.callback = req.query.callback;
      }
      if('response-nonce' in req.query) {
        data['sec:nonce'] = req.query['response-nonce'];
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
 * Handles a request to get Transactions.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getTransactions(req, res, next) {
  return next(new PaySwarmError(
    'Not implemented.',
    MODULE_TYPE + '.NotImplemented'));
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
 * @param query the query to use.
 * @param nonce the nonce to use when encrypting the duplicate.
 * @param callback(err) called once the operation completes.
 */
function _createDuplicateError(actor, query, nonce, callback) {
  // get a matching contract
  payswarm.financial.getTransactions(
    actor, query, {transaction: true}, {limit: 1}, function(err, record) {
      if(err) {
        return callback(err);
      }
      if(!record) {
        return callback(new PaySwarmError(
          'No duplicate Contract found when expecting one.',
          MODULE_TYPE + '.NoDuplicateContract'));
      }

      // duplicate found, return it in an error
      var contract = record.transaction;
      _encryptShortContract(contract, nonce, function(err, encrypted) {
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
 * Encrypts a short-form Contract for delivery to the vendor.
 *
 * @param contract the Contract to encrypt.
 * @param nonce the security nonce to use (or null).
 * @param callback(err, encrypted) called once the operation completes.
 */
function _encryptShortContract(contract, nonce, callback) {
  // get vendor key from listing signature
  var vendorKey = contract['ps:listing']['sec:signature']['dc:creator'];

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
      framed, vendorKey, nonce, callback);
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
