/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 *
 * This module provides an interface to the USAePay payment gateway.
 */
var async = require('async');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  logger: require('./loggers').get('app'),
  tools: require('./tools')
};
var USAePayClient = require('./usaepay-client').USAePayClient;
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.paymentGateway';

// payment gateway module API
var api = {};
api.name = MODULE_TYPE + '.USAePay';
api.gatewayName = 'USAePay';
api.authorityOnly = false;
api.client = null;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  async.waterfall([
    function(callback) {
      try {
        // create usaepay client
        var cfg = payswarm.config.usaepay;
        api.client = new USAePayClient({
          mode: cfg.mode,
          timeout: cfg.timeout,
          debug: cfg.debug,
          wsdlDir: cfg.auth.wsdlDir,
          sourceKey: cfg.auth.sourceKey,
          pin: cfg.auth.pin
        });
        callback();
      }
      catch(ex) {
        callback(ex);
      }
    },
    function(callback) {
      api.client.init(callback);
    }
  ], callback);
};

/**
 * Attempts to create a payment token. This may result in a hold on funds
 * for a customer, but it *must not* result in a capture of those funds. If
 * tokenization is not supported, then the callback will return a null
 * token.
 *
 * @param source the source of funds (eg: BankAccount).
 * @param token the PaymentToken with custom information to store.
 * @param callback(err, token) called once the operation completes.
 */
api.createPaymentToken = function(source, token, callback) {
  async.waterfall([
    function(callback) {
      api.client.tokenize(source, callback);
    },
    function(paymentToken, callback) {
      token = payswarm.tools.extend(token, paymentToken);
      token.paymentGateway = api.gatewayName;
      token.psaVerified = false;
      token.psaVerifyReady = false;
      callback(null, token);
    },
  ], function(err, token) {
    if(err) {
      err = new PaySwarmError(
        'Could not create PaymentToken.',
        MODULE_TYPE + '.PaymentTokenError', null, err);
    }
    callback(err, token);
  });
};

/**
 * Charges a customer's payment source for a Deposit. A customer's payment
 * source may be approved even if there are some errors, like all AVS (address
 * verification service) checks did not pass, e.g. their zip and/or their
 * address was incorrect. This information will be returned in the result.
 *
 * If the payment source was not approved, an error will be returned.
 *
 * @param deposit the Deposit with a payment source, e.g. a PaymentToken.
 * @param callback(err, result) called once the operation completes.
 */
api.chargeDepositSource = function(deposit, callback) {
  payswarm.logger.debug(api.name + ', charging deposit source...', deposit);

  // clear any existing errors, initialize
  var result = {
    approved: false,
    response: null,
    errors: []
  };

  var source = deposit.source;
  async.waterfall([
    function(callback) {
      api.client.charge(source, deposit.amount, callback);
    },
    function(res, callback) {
      payswarm.logger.debug(api.name + ', gateway charge result',
        {response: res, deposit: deposit});
      result.response = res;

      var err = null;

      // gateway error
      if(res.ResultCode === 'E') {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not charge Deposit payment source; a communication error ' +
          'occurred with the payment gateway. No attempt was made to charge ' +
          'the payment source.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      }
      // transaction declined
      else if(res.ResultCode === 'D') {
        result.errors.push('declined');
        err = new PaySwarmError(
          'Could not charge Deposit payment source; the payment gateway ' +
          'declined the payment source.',
          MODULE_TYPE + '.Declined', {result: result});
      }
      // transaction approved
      else if(res.ResultCode === 'A') {
        result.approved = true;
        // add auth approval code for receipt logs
        deposit.psaGatewayApprovalCode = res.AuthCode;
        deposit.psaGatewayRefId = res.RefNum;
      }
      callback(err, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    if(!result.approved) {
      err = new PaySwarmError(
        'Deposit not approved.',
        MODULE_TYPE + '.DepositNotApproved',
        {errors: result.errors}, err);
    }
    callback(err, result);
  });
};

/**
 * Credits a customer's payment destination for a Withdrawal.
 *
 * If the payment destination was not approved, an error will be returned.
 *
 * @param withdrawal the Withdrawal with a payment destination, e.g. a
 *          PaymentToken.
 * @param callback(err, result) called once the operation completes.
 */
api.creditWithdrawalDestination = function(withdrawal, callback) {
  payswarm.logger.debug(
    api.name + ', crediting withdrawal destination...', withdrawal);

  // clear any existing errors, initialize
  var result = {
    approved: false,
    response: null,
    errors: []
  };

  var destination = withdrawal.destination;
  async.waterfall([
    function(callback) {
      api.client.credit(destination, {amount: withdrawal.amount}, callback);
    },
    function(res, callback) {
      payswarm.logger.debug(api.name + ', gateway credit result',
        {response: res, withdrawal: withdrawal});
      result.response = res;

      var err = null;

      // gateway error
      if(res.ResultCode === 'E') {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not credit Withdrawal payment destination; a communication ' +
          'error occurred with the payment gateway. No attempt was made to ' +
          'credit the payment destination.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      }
      // transaction declined
      else if(res.ResultCode === 'D') {
        result.errors.push('declined');
        err = new PaySwarmError(
          'Could not credit Withdrawal payment destination; the payment ' +
          'gateway declined the payment destination.',
          MODULE_TYPE + '.Declined', {result: result});
      }
      // transaction approved
      else if(res.ResultCode === 'A') {
        result.approved = true;
        // add auth approval code for receipt logs
        withdrawal.psaGatewayApprovalCode = res.AuthCode;
        withdrawal.psaGatewayRefId = res.RefNum;
      }
      callback(err, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    if(!result.approved) {
      err = new PaySwarmError(
        'Withdrawal not approved.',
        MODULE_TYPE + '.WithdrawalNotApproved',
        {errors: result.errors}, err);
    }
    callback(err, result);
  });
};

/**
 * Gets the external status of a Transaction. If the Transaction is a Deposit
 * or a Withdrawal, an inquiry will be sent to the payment gateway to
 * determine its state.
 *
 * @param txn the Transaction to inquire about.
 * @param callback(err, result) called once the operation completes.
 */
api.getTransactionStatus = function(txn, callback) {
  payswarm.logger.debug(api.name + ', inquiring about transaction...', txn);

  var isDeposit = jsonld.hasValue(txn, 'type', 'com:Deposit');
  var isWithdrawal = jsonld.hasValue(txn, 'type', 'com:Withdrawal');
  if(!(isDeposit || isWithdrawal)) {
    // always consider non-deposit/non-withdrawals to be externally settled
    return callback(null, {status: 'settled'});
  }

  // do inquiry
  api.client.inquire(txn, function(err, res) {
    var result = {
      status: 'error',
      response: res,
      errors: []
    };

    // parse response, set result status to 'error', 'pending', 'settled',
    // or 'voided'
    var checkTrace = res.CheckTrace;
    var statusCode = checkTrace.StatusCode;
    switch(statusCode) {
    // Queued New Transaction (hasn't been processed yet)
    case 'N':
    // Pending For credit cards, batch hasn't closed yet. For checks, hasn't
    // been sent to Bank yet.
    case 'P':
    // Submitted For checks, sent to bank and void no longer available.
    case 'B':
    // Funded Funded (for checks, the date that the money left the account).
    case 'F':
      result.status = 'pending';
      break;
    // Settled For credit cards batch has been closed and transaction has
    // settled. For checks, the transaction has cleared.
    case 'S':
      result.status = 'settled';
      break;
    // Error Transaction encountered a post processing error. Not common.
    case 'E':
      result.status = 'error';
      result.errors.push('error');
      break;
    // Voided Check transaction that has been voided.
    case 'V':
    // Returned Check transaction that has been returned by the bank
    // (eg: for insufficient funds).
    case 'R':
      result.status = 'voided';
      break;
    // Timed out Check transaction, no update has been received from the
    // processor in 5 days.
    case 'T':
      result.status = 'error';
      result.errors.push('timedOut');
      break;
    // Manager Approval Req. Transaction has been put on hold pending manager
    // approval. (checks)
    case 'M':
      result.status = 'error';
      result.errors.push('managerApprovalRequired');
      break;
    default:
      result.status = 'error';
      result.errors.push('invalidResponse');
      break;
    }

    callback(null, result);
  });
};

/**
 * Adds Payees for this gateway to the given Deposit.
 *
 * @param deposit the Deposit to add Payees to.
 * @param callback(err, deposit) called once the operation completes.
 */
api.addDepositPayees = function(deposit, callback) {
  // append gateway payees
  var cfg = payswarm.config.financial.paymentGateway.USAePay.payees.deposit;
  var src = deposit.source;
  if(src.paymentMethod in cfg) {
    jsonld.addValue(deposit, 'payee', cfg[src.paymentMethod]);
  }
  callback(null, deposit);
};

/**
 * Adds Payees for this gateway to the given Withdrawal.
 *
 * @param withdrawal the Withdrawal to add Payees to.
 * @param callback(err, withdrawal) called once the operation completes.
 */
api.addWithdrawalPayees = function(withdrawal, callback) {
  // append gateway payees
  var cfg = payswarm.config.financial.paymentGateway.USAePay.payees.withdrawal;
  var dst = withdrawal.destination;
  if(dst.paymentMethod in cfg) {
    jsonld.addValue(withdrawal, 'payee', cfg[dst.paymentMethod]);
  }
  callback(null, withdrawal);
};

/**
 * Blinds confidential information in a customer's deposit/payment source.
 *
 * @param deposit the Deposit with a payment source, e.g. CreditCard, to
 *          blind.
 * @param callback(err, blinded) called once the operation completes.
 */
api.blindDeposit = function(deposit, callback) {
  callback(null, deposit);
};

/**
 * Blinds confidential information in a customer's withdrawal/payment
 * destination.
 *
 * @param withdrawal the Withdrawal with a payment destination, e.g.
 *          BankAccount, to blind.
 * @param callback(err, blinded) called once the operation completes.
 */
api.blindWithdrawal = function(withdrawal, callback) {
  callback(null, withdrawal);
};
