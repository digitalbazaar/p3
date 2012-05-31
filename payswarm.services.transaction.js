/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
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
}

/**
 * Handles a request to process a Contract.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processContract(req, res, next) {
}

/**
 * Handles a request to process a Deposit.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processDeposit(req, res, next) {
}

/**
 * Handles a request to process a Withdrawal.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processWithdrawal(req, res, next) {
}

/**
 * Handles a request to process a PurchaseRequest.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processPurchaseRequest(req, res, next) {
}

/**
 * Handles a request to process a Transfer.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _processTransfer(req, res, next) {
}

/**
 * Handles a request to get a PaymentForm.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getPaymentForm(req, res, next) {
}

/**
 * Handles a request to get Transactions.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getTransactions(req, res, next) {
}
