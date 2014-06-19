/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  db: bedrock.modules['bedrock.database'],
  docs: bedrock.docs,
  events: bedrock.events,
  financial: require('./financial'),
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  resource: require('./resource'),
  security: require('./security'),
  tools: require('./tools'),
  validation: bedrock.validation
};
var BedrockError = payswarm.tools.BedrockError;
var Money = require('./money').Money;
var validate = payswarm.validation.validate;

// constants
var MODULE_NS;

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
  payswarm.website = bedrock.modules['bedrock.website'];
  MODULE_NS = payswarm.website.namespace;
  addServices(app, callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.website.ensureAuthenticated;
  var getDefaultViewVars = payswarm.website.getDefaultViewVars;

  payswarm.docs.annotate.post(
      '/transactions [PurchaseRequest]',
      'services.transaction.postPurchaseRequest');

  // for transactions, ensureAuthenticated called on each type so
  // purchases can enable signed graph checking.
  app.server.post('/transactions',
    validate({query: 'services.transaction.postTransactionsQuery'}),
    function(req, res, next) {
      if(req.query.quote === 'true') {
        return validate('services.transaction.postQuote')(
          req, res, function(err) {
            _process(err, _processQuote, req, res, next);
        });
      }

      if(jsonld.hasValue(req.body, 'type', 'PurchaseRequest')) {
        return validate('services.transaction.postPurchaseRequest')(
          req, res, function(err) {
            // finalized contract ID based on purchase request
            if('transactionId' in req.body) {
              _process(err, _processPartialPurchaseRequest, req, res, next);
            } else {
              // authentication optional if a signed purchase request
              _process(err, _processSignedPurchaseRequest, req, res, next, {
                ensureAuthenticated: false
              });
            }
          });
      }

      // assume body is a transaction
      var txn = req.body;
      var isContract = jsonld.hasValue(txn, 'type', 'Contract');
      var isDeposit = jsonld.hasValue(txn, 'type', 'Deposit');
      var isWithdrawal = jsonld.hasValue(txn, 'type', 'Withdrawal');
      var isTransaction = jsonld.hasValue(txn, 'type', 'Transaction');

      // invalid type combinations
      if((isContract && (isDeposit || isWithdrawal)) ||
        (isDeposit && isWithdrawal)) {
        return next(new BedrockError(
          'Invalid transaction type combination.',
          MODULE_NS + '.InvalidTransactionType'));
      }

      if(isContract) {
        return validate('services.transaction.postContract')(
          req, res, function(err) {
            _process(err, _processContract, req, res, next);
          });
      }
      if(isDeposit) {
        return validate('services.transaction.postDeposit')(
          req, res, function(err) {
            _process(err, _processDeposit, req, res, next);
          });
      }
      if(isWithdrawal) {
        return validate('services.transaction.postWithdrawal')(
          req, res, function(err) {
            _process(err, _processWithdrawal, req, res, next);
          });
      }
      // simple transfer
      if(isTransaction && jsonld.getValues(txn, 'type').length === 1) {
        return validate('services.transaction.postTransfer')(
          req, res, function(err) {
            _process(err, _processTransfer, req, res, next);
          });
      }
      next(new BedrockError(
        'Invalid transaction type.', MODULE_NS + '.InvalidTransactionType'));
  });

  payswarm.docs.annotate.get(
    '/transactions/:id',
    'services.transaction.getTransaction');
  app.server.get('/transactions/:id', ensureAuthenticated,
    function(req, res, next) {
    var transactionId = payswarm.financial.createTransactionId(req.params.id);
    async.auto({
      transaction: function(callback) {
        payswarm.financial.getTransaction(
          req.user.identity, transactionId, {external: true},
            function(err, transaction, meta) {
            callback(err, transaction);
          });
      },
      getVars: function(callback) {
        getDefaultViewVars(req, callback);
      },
      render: ['transaction', 'getVars', function(callback, results) {
        function ldjson() {
          res.json(results.transaction);
        }
        res.format({
          'application/ld+json': ldjson,
          json: ldjson,
          html: function() {
            var vars = results.getVars;
            vars.transaction = results.transaction;
            if(jsonld.hasValue(vars.transaction, 'type', 'Contract')) {
              vars.asset = vars.transaction.asset;
              vars.assetProvider = vars.transaction.assetProvider;
              vars.vendor = vars.transaction.vendor;
              vars.license = vars.transaction.license;
              vars.transfers = vars.transaction.transfer;
              vars.transactionType = 'Contract';
              vars.isContract = true;
            } else if(jsonld.hasValue(vars.transaction, 'type', 'Deposit')) {
              vars.transfers = vars.transaction.transfer;
              vars.transactionType = 'Deposit';
              vars.isDeposit = true;
            } else if(jsonld.hasValue(vars.transaction, 'type', 'Withdrawal')) {
              vars.transfers = vars.transaction.transfer;
              vars.transactionType = 'Withdrawal';
              vars.isWithdrawal = true;
            }

            res.render('transaction.html', vars);
          }
        });
      }]
    }, function(err) {
      if(err) {
        // fallback to not found handler
        if(err.details && err.details.httpStatusCode === 404) {
          return next();
        }
        next(err);
      }
    });
  });

  app.server.get('/transactions', ensureAuthenticated,
    validate({query: 'services.transaction.getTransactionsQuery'}),
    function(req, res, next) {
      if(req.query.form === 'pay') {
        return _getPaymentForm(req, res, next);
      }
      _getTransactions(req, res, next);
  });

  callback(null);
}

/**
 * Wrapper for calling a process function with error checking and
 * authentication checking with optional signed graph support.
 *
 * @param err error or null
 * @param req request
 * @param res response
 * @param next next handler
 * @param [options]:
 *          [ensureAuthenticated]: true to ensure authentication [true]
 */
function _process(err, process, req, res, next, options) {
  if(err) {
    return next(err);
  }
  var checkAuthentication = payswarm.website.checkAuthentication;
  var ensureAuthenticated = payswarm.website.ensureAuthenticated;
  if(options && ('ensureAuthenticated' in options) &&
    !options.ensureAuthenticated) {
    checkAuthentication(req, res, function(err, info) {
      if(err) {
        return next(err);
      }
      req.user = info;
      process(req, res, next);
    });
  } else {
    ensureAuthenticated(req, res, function(err) {
      if(err) {
        return next(err);
      }
      process(req, res, next);
    });
  }
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
    signerActor: req.user.identity,
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
  _generateQuote(req.user.identity, options, function(err, contract) {
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
  return next(new BedrockError(
    'Not implemented.',
    MODULE_NS + '.NotImplemented'));
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

    return async.waterfall([
      function(callback) {
        // sign the deposit for review
        payswarm.financial.signDeposit(
          req.user.identity, deposit, callback);
      },
      function(signed, callback) {
        var isBankAccount = (
          jsonld.hasValue(deposit.source, 'type', 'BankAccount') ||
          jsonld.hasValue(deposit.source, 'paymentMethod', 'BankAccount'));
        // ensure deposit amounts are below maximum
        var transfers = jsonld.getValues(signed, 'transfer');
        var amounts = {};
        transfers.forEach(function(transfer) {
          if(!(transfer.destination in amounts)) {
            amounts[transfer.destination] = new Money(transfer.amount);
          } else {
            amounts[transfer.destination] = amounts[transfer.destination].add(
              transfer.amount);
          }
        });
        async.forEach(Object.keys(amounts), function(dst, callback) {
          payswarm.financial.updateAccountBalanceSnapshot(
            null, dst, function(err, info) {
              if(err) {
                return callback(err);
              }
              if(info.allowStoredValue) {
                return callback();
              }
              if(isBankAccount) {
                return callback(new BedrockError(
                  'Bank account deposits into accounts that do not allow ' +
                  'stored value are prohibited.',
                  MODULE_NS + '.AccountStoredValueProhibited',
                  {account: dst, 'public': true, httpStatusCode: 400}));
              }
              if(amounts[dst].compareTo(info.max) > 0) {
                return callback(new BedrockError(
                  'The deposit amount would exceed the maximum balance for ' +
                  'the given account.',
                  MODULE_NS + '.MaximumBalanceExceeded',
                  {account: dst, 'public': true, httpStatusCode: 400}));
              }
              callback();
            });
        }, function(err) {
          callback(err, signed);
        });
      }
    ], function(err, signed) {
      if(err) {
        return next(err);
      }
      signed['@context'] = payswarm.constants.CONTEXT_URL;
      res.json(signed);
    });
  }

  // deposit already signed, process it
  payswarm.financial.processDeposit(
    req.user.identity, req.body, {request: req}, function(err, deposit) {
      if(err) {
        if(err.name === 'payswarm.financial.DepositExpired') {
          err = new BedrockError(
            'The deposit could not be processed because too much time has ' +
            'passed since it was started. Please go back and re-enter ' +
            'the deposit information.',
            MODULE_NS + '.DepositExpired',
            {'public': true, httpStatusCode: 400});
        }
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
  // withdrawal not signed, sign it for review
  if(!('signature' in req.body)) {
    // build clean withdrawal
    var withdrawal = {
      type: req.body.type,
      payee: req.body.payee,
      source: req.body.source,
      destination: req.body.destination
    };

    // add IP address to withdrawal
    // FIXME: support ipv6
    withdrawal.ipv4Address = req.ip;

    // sign the withdrawal for review
    return payswarm.financial.signWithdrawal(
      req.user.identity, withdrawal, function(err, signed) {
        if(err) {
          return next(err);
        }
        signed['@context'] = payswarm.constants.CONTEXT_URL;
        res.json(signed);
      });
  }

  // withdrawal already signed, process it
  payswarm.financial.processWithdrawal(
    req.user.identity, req.body, {request: req}, function(err, withdrawal) {
      if(err) {
        if(err.name === 'payswarm.financial.WithdrawalExpired') {
          err = new BedrockError(
            'The withdrawal could not be processed because too much time ' +
            'has passed since it was started. Please go back and re-enter ' +
            'the withdrawal information.',
            MODULE_NS + '.WithdrawalExpired',
            {'public': true, httpStatusCode: 400});
        }
        return next(err);
      }
      res.set('Location', withdrawal.id);
      res.json(201, withdrawal);
    });
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
        req.user.identity, req.body.transactionId, callback);
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
      _processFinalizedContract(
        req.user.identity, options, function(err, contract, budget) {
          callback(err, {contract: contract, budget: budget});
        });
    }],
    encryptReceipt: ['processContract', function(callback, results) {
      var nonce = null;
      if('nonce' in req.body) {
        nonce = req.body.nonce;
      }
      _createReceipt(results.processContract.contract, {
        nonce: nonce,
        budget: results.processContract.budget
      }, function(err, receipt, encrypted) {
        callback(err, {
          receipt: receipt,
          encrypted: encrypted
        });
      });
    }],
    emailContract: ['processContract', function(callback, results) {
      _emailContract(results.processContract.contract, callback);
    }]
  }, function(err, results) {
    if(err) {
      return next(err);
    }

    // respond with encrypted receipt if nonce was given, else receipt
    var body = ('nonce' in req.body) ?
      results.encryptReceipt.encrypted : results.encryptReceipt.receipt;
    var contractId = results.processContract.contract.id;
    res.set('Location', contractId);
    res.json(201, body);
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
    return next(new BedrockError(
      'The purchase request was rejected because it included ' +
      'security parameters that must not be sent when performing a ' +
      'vendor-initiated purchase. Please ensure that your e-commerce ' +
      'software is functioning properly to avoid any potential security risk.',
      MODULE_NS + '.InvalidParameters', {
        'public': true,
        httpStatusCode: 400
      }));
  }

  /* Note: If purchase request was authorized by the asset acquirer, then
   the request may include an account ID, otherwise it must be
   authorized by the vendor and a budget look up will be performed. */
  var options = {
    acquirer: req.body.identity,
    listing: req.body.listing,
    listingHash: req.body.listingHash,
    cache: false
  };

  var requireBudget;
  var signer;
  var acquirerActor;

  async.waterfall([
    function(callback) {
      payswarm.financial.verifyTransaction(req.body, callback);
    },
    function(_signer, callback) {
      signer = _signer;
      options.signerActor = signer.profile;
      options.requester = signer.identity.id;
      if('referenceId' in req.body) {
        options.referenceId = req.body.referenceId;
      }
      if(req.body.source) {
        // if purchase request is not by the acquirer, prohibit source account
        if(options.requester !== options.acquirer) {
          return callback(new BedrockError(
            'A source FinancialAccount may only be provided if the Asset ' +
            'acquirer made the purchase request.',
            MODULE_NS + '.InvalidParameter', {
              requester: options.requester,
              acquirer: options.acquirer,
              'public': true
            }));
        }
        options.source = req.body.source;

        // require a budget if no source financial account provided
        requireBudget = !options.source;
      }
      callback();
    },
    function(callback) {
      // get acquirer identity
      payswarm.identity.getIdentity(
        null, options.acquirer, function(err, identity) {
          callback(err, identity);
        });
    },
    function(acquirer, callback) {
      // generate quote as acquirer owner
      acquirerActor = {id: acquirer.owner};
      _generateQuote(acquirerActor, options, callback);
    },
    function(contract, callback) {
      // process as acquirer owner
      _processFinalizedContract(
        acquirerActor, {
          contract: contract,
          allowBudget: true,
          requireBudget: requireBudget
        }, callback);
    },
    function(contract, budget, callback) {
      // generate or sanitize based on req.user if available
      // FIXME pass and process req.user as 'actor'
      _createReceipt(contract, {budget: budget}, function(err, receipt) {
        callback(err, receipt);
      });
    },
    function(receipt, callback) {
      // FIXME: remove this when receipt actor handling above is implemented
      // FIXME: for now, if actor !== signer, strip all but id
      if(!req.user || (req.user.identity.id !== signer.identity.id)) {
        receipt = {
          id: receipt.id
        };
      }
      callback(null, receipt);
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
  return next(new BedrockError(
    'Not implemented.',
    MODULE_NS + '.NotImplemented'));
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

  var getDefaultViewVars = payswarm.website.getDefaultViewVars;
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
      if('referer' in req.headers) {
        data.referer = req.headers.referer;
      }

      // render view
      res.render('purchase.html', vars);
    }
  ], function(err) {
    if(err) {
      return next(err);
    }
  });
}

/**
 * Parses a date string into a date. If the date string can be parsed as
 * an integer, then it will
 *
 * @param str the date string.
 *
 * @return the Date or null on parse error.
 */
function _parseDate(str) {
  var rval = null;
  if(isFinite(str)) {
    // assume number is in seconds
    rval = new Date(1000 * parseInt(str, 10));
  } else {
    rval = new Date(str);
  }
  // invalid date
  if(isNaN(+rval)) {
    rval = null;
  }
  return rval;
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
    createdStart: _parseDate(req.query.createdStart) || new Date(),
    createdEnd: _parseDate(req.query.createdEnd) || null,
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
          req.user.identity, options.account, function(err, account) {
            callback(err, account);
          });
      }
      callback(null, null);
    },
    function(account, callback) {
      if(account) {
        query.accounts = payswarm.db.hash(account.id);
      } else {
        // use identity
        if(!req.user.identity) {
          // no transactions
          return callback(null, []);
        }
        query.identities = payswarm.db.hash(req.user.identity.id);
      }

      // run query
      var opts = {sort: {created: -1, id: 1}, limit: options.limit};
      if(options.previous !== null) {
        opts.min = {};
        if(options.account) {
          opts.min.accounts = payswarm.db.hash(options.account);
        } else {
          opts.min.identities = query.identities;
        }
        opts.min.created = options.createdStart;
        opts.min.id = payswarm.db.hash(options.previous);
        opts.skip = 1;
      }

      // skip participant check if identity is used; identity query will
      // only return results for which identity is a participant
      var flags = {
        external: true
      };
      if(query.identities) {
        flags.isParticipant = true;
      }
      payswarm.financial.getTransactions(
        req.user.identity, query, {transaction: true}, opts, flags, callback);
    },
    function(records, callback) {
      var txns = [];
      records.forEach(function(record) {
        // FIXME: make general function for @context to url?
        var txn = record.transaction;
        var contextUrl = payswarm.constants.CONTEXT_URL;
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
 *          signerActor the profile of the entity that signed (authorized)
 *            the generation of a quote. (FIXME, a little hackish)
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
        return callback(new BedrockError(
          'Neither the Asset acquirer or source FinancialAccount were ' +
          'provided.',
          MODULE_NS + '.InvalidParameter'));
      }

      // get acquirer based on source account owner
      payswarm.financial.getAccount(actor, options.source,
        function(err, account) {
          if((err && err.name === 'payswarm.permission.PermissionDenied') ||
            (!err && options.acquirer && options.acquirer !== account.owner)) {
            err = new BedrockError(
              'The Asset acquirer does not have permission to use the ' +
              'FinancialAccount selected to provide payment for the Asset.',
              MODULE_NS + '.PermissionDenied', {
                acquirer: options.acquirer,
                source: options.source,
                'public': true,
                httpStatusCode: 400
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
        type: 'Listing',
        store: true,
        strict: true,
        fetch: true
      };
      payswarm.resource.listing.get(query, function(err, records) {
        if(err) {
          err = new BedrockError(
            'The vendor that you are attempting to purchase something from ' +
            'has provided us with a bad asset listing. This is typically a ' +
            'problem with their e-commerce software. You may want to notify ' +
            'them of this issue.',
            MODULE_NS + '.InvalidListing', {
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
          return callback(new BedrockError(
            'Listings must have exactly one signature.',
            MODULE_NS + '.InvalidSignatureCount', {
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
        type: 'Asset',
        strict: true,
        fetch: true
      };
      payswarm.resource.asset.get(query, function(err, records) {
        if(err) {
          err = new BedrockError(
            'We could not find the information associated with the asset ' +
            'you were trying to purchase. This is typically a problem with ' +
            'the vendor\'s e-commerce software. You may want to notify ' +
            'them of this issue.',
            MODULE_NS + '.InvalidAsset', {
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
          return callback(new BedrockError(
            'Assets must have exactly one signature.',
            MODULE_NS + '.InvalidSignatureCount', {
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

      // authorizing identity (requester) *must* be the vendor or acquirer
      var listing = results.getListing;
      if(options.requester !== listing.vendor &&
        options.requester !== results.getAcquirer) {
        return callback(new BedrockError(
          'The purchase request was not authorized by the vendor ' +
          'or Asset acquirer.',
          MODULE_NS + '.PermissionDenied',
          {httpStatusCode: 400, 'public': true}));
      }

      // try to find matching budget
      _getBudget(results.getAcquirer, listing.vendor,
        function(err, budget) {
          // no budget found and no source account provided
          if(!err && !budget) {
            err = new BedrockError(
              'No source FinancialAccount given and no applicable budget ' +
              'found for the given Contract.',
              MODULE_NS + '.BudgetNotFound',
              {httpStatusCode: 404, 'public': true});
            return callback(err);
          }
          options.source = budget.source;
          return callback(err, budget);
      });
    }],
    checkDuplicate: ['getBudget', function(callback, results) {
      var opts = {assetAcquirer: results.getAcquirer};
      if('referenceId' in options) {
        opts.referenceId = options.referenceId;
      } else {
        opts.asset = results.getAsset.id;
      }
      _checkDuplicate(options.signerActor, opts, callback);
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
      _createDuplicateError(options.signerActor, opts, callback);
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
 * @param callback(err, contract, budget) called once the operation completes.
 */
function _processFinalizedContract(actor, options, callback) {
  async.auto({
    getBudget: function(callback, results) {
      if(!options.allowBudget) {
        return callback(null, null);
      }

      // get budget based on acquirer ID and vendor ID
      var contract = options.contract;
      var acquirerId = contract.assetAcquirer.id;
      var vendorId = contract.vendor.id;
      _getBudget(acquirerId, vendorId, function(err, budget) {
        if(err) {
          return callback(err);
        }
        if(!budget) {
          if(options.requireBudget) {
            err = new BedrockError(
              'No applicable budget found for the given Contract.',
              MODULE_NS + '.BudgetNotFound');
          }
          return callback(err, null);
        }
        if(budget.source !== contract.transfer[0].source) {
          err = new BedrockError(
            'The source FinancialAccount in the Contract does not match ' +
            'the budget associated with the vendor.',
            MODULE_NS + '.MismatchedBudget');
        }
        callback(err, budget);
      });
    },
    updateBudget: ['getBudget', function(callback, results) {
      var budget = results.getBudget;
      if(budget) {
        // subtract contract amount from the budget
        var amount = new Money(options.contract.amount).negate();
        return payswarm.financial.updateBudgetBalance(
          actor, budget.id, {amount: amount}, callback);
      }
      // no budget
      callback();
    }],
    processContract: ['updateBudget', function(callback, results) {
      var contract = options.contract;

      // create duplicate query
      var acquirerId = contract.assetAcquirer.id;
      var query = _createDuplicateQuery(acquirerId);

      // do reference ID look up
      if('referenceId' in contract) {
        query.referenceId = payswarm.db.hash(contract.referenceId);
      } else {
        // do asset look up
        query.asset = payswarm.db.hash(contract.asset.id);
      }

      // attempt to process contract
      payswarm.financial.processContract(
        actor, contract, {duplicateQuery: query}, function(err) {
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
                actor, budget.id, {amount: amount}, callback);
            },
            function(callback) {
              // handle duplicate contract
              if(err.name === 'payswarm.financial.DuplicateTransaction') {
                var opts = {query: query};
                if('nonce' in options) {
                  opts.nonce = options.nonce;
                }
                if(results.getBudget) {
                  opts.budget = results.getBudget;
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
    callback(null, results.processContract, results.getBudget);
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
 * 1. assetAcquirer+referenceId
 * 2. assetAcquirer+asset
 * 3. assetAcquirer+asset+assetHash
 *
 * FIXME: Lower layers permit nearly any sort of check that combines
 * assetAcquirer+asset + other parameters, however, this isn't implemented
 * here yet.
 *
 * assetAcquirer: The ID of the Asset acquirer.
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
  var query = _createDuplicateQuery(options.assetAcquirer);

  if('referenceId' in options) {
    // do reference ID look up
    query.referenceId = payswarm.db.hash(options.referenceId);
  } else if('asset' in options) {
    // do asset look up
    query.asset = payswarm.db.hash(options.asset);
    if(options.assetHash) {
      query['transaction.listing.assetHash'] = options.assetHash;
    }
  } else {
    return callback(new BedrockError(
      'Invalid duplicate Contract query.',
      MODULE_NS + '.InvalidDuplicateContractQuery'));
  }

  payswarm.financial.hasContract(actor, query, function(err, exists) {
    if(err) {
      return callback(err);
    }
    callback(null, exists ? query : null);
  });
}

/**
 * Create a query to check for duplicates.
 *
 * @param assetAcquirer the Identity ID of the Asset acquirer to use.
 */
function _createDuplicateQuery(assetAcquirer) {
  // assetAcquirer *must* be present, must not be pending or voided
  return {
    assetAcquirer: payswarm.db.hash(assetAcquirer),
    state: {$nin: ['pending', 'voiding', 'voided']}
  };
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
 *          [budget] the budget associated with the contract's vendor.
 * @param callback(err) called once the operation completes.
 */
function _createDuplicateError(actor, options, callback) {
  var query = options.query;

  // get a matching contract
  payswarm.financial.getTransactions(
    actor, query, {transaction: true}, {limit: 1}, {external: true},
      function(err, records) {
      if(err) {
        return callback(err);
      }
      if(records.length === 0) {
        return callback(new BedrockError(
          'No duplicate Contract found when expecting one.',
          MODULE_NS + '.NoDuplicateContract'));
      }

      // get duplicate contract
      var contract = records[0].transaction;

      _createReceipt(contract, {
        nonce: ('nonce' in options ? options.nonce : null),
        budget: options.budget
      }, function(err, receipt, encrypted) {
        if(err) {
          return callback(err);
        }

        var details = {
          receipt: receipt,
          contract: contract,
          httpStatusCode: 409,
          'public': true
        };
        if(encrypted) {
          details.encryptedMessage = encrypted;
        }

        callback(new BedrockError(
          'Duplicate purchase found.',
          MODULE_NS + '.DuplicatePurchase', details));
      });
    });
}

/**
 * Emails a contract of the purchase to the buyer.
 *
 * @param contract the processed contract.
 * @param callback(err, emailSuccessful) called once the operation completes.
 */
function _emailContract(contract, callback) {
  // FIXME: vendor and assetProvider emails
  // FIXME: emails should be optional and rate limited via per-profile settings
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
      payswarm.events.emit({
        type: 'common.Purchase.success',
        details: {
          profile: profile,
          contract: contract
        }
      });

      callback();
    }
  ], callback);
}

/**
 * Creates a Receipt for the given Contract.
 *
 * @param contract the related Contract.
 * @param options the options to use:
 *          [nonce]: non-null to also output an encrypted receipt.
 *          [budget]: non-null to include a preference for auto-purchase.
 * @param callback(err, receipt, encrypted) called once the operation completes.
 */
function _createReceipt(contract, options, callback) {
  // reframe contract to a short contract
  var frame = payswarm.constants.FRAMES['Contract/Short'];
  if(!('@context' in contract)) {
    contract['@context'] = frame['@context'];
  }
  jsonld.frame(contract, frame, function(err, framed) {
    if(err) {
      return callback(err);
    }
    var result = framed['@graph'][0];

    // add pre-auth preference if a budget is associated w/vendor
    var preferences = [];
    if(options.budget) {
      preferences.push('PreAuthorization');
    }
    var receipt = {
      '@context': payswarm.constants.CONTEXT_URL,
      type: 'Receipt',
      preferences: preferences,
      contract: result
    };

    if(options.nonce !== null) {
      // get vendor key from listing signature
      var vendorKey = contract.listing.signature.creator;
      return payswarm.identity.encryptMessage(
        receipt, vendorKey, options.nonce, function(err, encrypted) {
          callback(err, receipt, encrypted);
        });
    }

    // sign receipt
    async.waterfall([
      function(callback) {
        // get authority keys without permission check
        payswarm.identity.getAuthorityKeyPair(
          null, function(err, publicKey, privateKey) {
            callback(err, {publicKey: publicKey, privateKey: privateKey});
          });
      },
      function(keypair, callback) {
        var privateKey = keypair.privateKey;
        var publicKey = keypair.publicKey;
        payswarm.security.signJsonLd(
          receipt, privateKey, publicKey.id, callback);
      }
    ], function(err, signed) {
      callback(err, signed, null);
    });
  });
}
