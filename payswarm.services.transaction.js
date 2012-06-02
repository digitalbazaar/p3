/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld');
var payswarm = {
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
  // FIXME: implement me

  async.auto({
    getAccount: function(callback) {
      payswarm.financial.getAccount(
        req.user.profile, req.body['com:source'], function(err, account) {
          callback(err, account);
        });
    },
    getListing: function(callback) {
      // FIXME: reconsider this API
      var query = {
        id: req.body['ps:listing'],
        hash: req.body['ps:listingHash'],
        type: 'ps:Listing',
        store: true,
        strict: true,
        fetch: true
      };
      payswarm.asset.listings.get(query, callback);
    }
    // FIXME: continue
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
