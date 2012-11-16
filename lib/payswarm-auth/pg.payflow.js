/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 *
 * This module provides an interface to the Payflow payment gateway.
 */
var async = require('async');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  logger: require('./loggers').get('app'),
  tools: require('./tools')
};
var PayflowClient = require('./payflow-client').PayflowClient;
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.paymentGateway';

// test payment gateway module API
var api = {};
api.name = MODULE_TYPE + '.Payflow';
api.gatewayName = 'Payflow';
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
        // create payflow client
        var cfg = payswarm.config.payflow;
        api.client = new PayflowClient({
          mode: cfg.mode,
          timeout: cfg.timeout,
          debug: cfg.debug,
          user: cfg.auth.user,
          vendor: cfg.auth.vendor,
          partner: cfg.auth.partner,
          password: cfg.auth.password
        });
        callback();
      }
      catch(ex) {
        callback(ex);
      }
    }
  ], callback);
};

/**
 * Attempts to create a payment token. This may result in a hold on funds
 * for a customer, but it *must not* result in a capture of those funds. If
 * tokenization is not supported, then the callback will return a null
 * token.
 *
 * @param source the source of funds (eg: CreditCard, BankAccount).
 * @param token the PaymentToken with custom information to store.
 * @param callback(err, token) called once the operation completes.
 */
api.createPaymentToken = function(source, token, callback) {
  async.waterfall([
    function(callback) {
      api.client.verify(source, callback);
    },
    function(res, callback) {
      var err = null;
      // parse result code
      var rc = parseInt(res.response.RESULT);
      if(rc < 0) {
        err = new PaySwarmError(
          'Could not create PaymentToken; a communication error occurred ' +
          'with the payment gateway. No attempt was made to verify the ' +
          'payment source.', {response: res});
      }
      else if(rc > 0) {
        err = new PaySwarmError(
          'Could not create PaymentToken; the payment gateway declined ' +
          'the payment source.', {response: res});
      }
      // check AVS and CVV2 values
      else if(
        res.response.AVSADDR !== 'Y' || res.response.AVSZIP !== 'Y' ||
        res.response.CVV2MATCH !== 'Y') {
        err = new PaySwarmError(
          'Could not create PaymentToken; the associated address and/or ' +
          'card security code could not be verified.', {response: res});
      }
      if(err) {
        return callback(err);
      }
      if(res.paymentToken === null) {
        return callback(null, null);
      }
      token = payswarm.tools.extend(token, res.paymentToken);
      token.paymentGateway = api.gatewayName;
      token.psaVerified = (token.paymentMethod === 'ccard:CreditCard');
      token.psaVerifyReady = token.psaVerified;
      callback(null, token);
    },
  ], callback);
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
      // parse result code
      var rc = parseInt(res.response.RESULT);
      if(rc < 0) {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not charge Deposit payment source; a communication error ' +
          'occurred with the payment gateway. No attempt was made to charge ' +
          'the payment source.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      }
      else if(rc > 0) {
        result.errors.push('declined');
        err = new PaySwarmError(
          'Could not charge Deposit payment source; the payment gateway ' +
          'declined the payment source.',
          MODULE_TYPE + '.Declined', {result: result});
      }
      if(err) {
        return callback(err);
      }
      result.approved = true;
      // add auth approval code for receipt logs
      deposit.psaGatewayApprovalCode = res.AUTHCODE;
      deposit.psaGatewayRefId = res.PNREF;
      callback(null, result);
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
  // return early for now, withdrawal not presently supported
  return callback(new PaySwarmError(
    'Withdrawal is not supported by the Payflow gateway.',
    MODULE_TYPE + '.NotSupported'));

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
      // parse result code
      var rc = parseInt(res.response.RESULT);
      if(rc < 0) {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not credit Withdrawal payment destination; a communication ' +
          'error occurred with the payment gateway. No attempt was made to ' +
          'credit the payment destination.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      }
      else if(rc > 0) {
        result.errors.push('declined');
        err = new PaySwarmError(
          'Could not credit Withdrawal payment destination; the payment ' +
          'gateway declined the payment destination.',
          MODULE_TYPE + '.Declined', {result: result});
      }
      if(err) {
        return callback(err);
      }
      result.approved = true;
      // add auth approval code for receipt logs
      withdrawal.psaGatewayApprovalCode = res.AUTHCODE;
      withdrawal.psaGatewayRefId = res.PNREF;
      callback(null, result);
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

  if(isDeposit) {
    // always consider credit card deposits to be externally settled
    var src = txn.source;
    if(jsonld.hasValue(src, 'paymentMethod', 'ccard:CreditCard') ||
      jsonld.hasValue(src, 'type', 'ccard:CreditCard')) {
      return callback(null, {status: 'settled'});
    }
  }

  // do inquiry
  api.client.inquire(txn, function(err, res) {
    var result = {
      status: 'pending',
      response: res,
      errors: []
    };

    // parse result code
    var rc = parseInt(res.response.RESULT);
    if(rc < 0) {
      result.status = 'error';
      result.errors.push('unprocessed');
    }
    else if(rc > 0) {
      result.status = 'voided';
    }
    else if(!res.response.STATUS ||
      res.response.STATUS[0] !== 'P' ||
      res.response.STATUS[0] !== 'R' ||
      res.response.STATUS[0] !== 'C') {
      result.status = 'error';
      result.errors.push('invalidRepsonse');
    }
    // gateway returned an error, short-circuit
    if(result.status === 'error') {
      return callback(null, result);
    }

    // determine result.status based on STATUS codes, set it to either:
    // 'error', 'settled', 'pending', or 'voided'

    // handle PayPal (PXX), NACHA (RXX), or Notification of Change (CXX)
    // transaction STATUS codes
    switch(res.response.STATUS) {
    // Pending PayPal received payment but customer's portion of the request
    // not sent for settlement
    case 'P02':
    // Pending A re-tried payment is pending settlement
    case 'P04':
      result.status = 'pending';
      break;
    // Submitted Customer portion of the request sent to ODFI, settle request
    // is believed to be settled unless returned
    case 'P03':
      result.status = 'settled';
      break;
    // Will not settle Status for inquiry and voided payments
    case 'P05':
    // Will not settle Status for void payments
    case 'P06':
    // Rejected Payflow server rejected the payment immediately (invalid ABA)
    case 'P15':
      result.status = 'voided';
      break;
    default:
      // NACHA error code
      if(res.response.STATUS[0] === 'R') {
        result.status = 'voided';
      }
      // FIXME: figure out what happens here w/the current txn
      // NOC code (not actually an error? or did it not work at all?)
      else if(res.response.STATUS[0] === 'C') {
        result.status = 'voided';
      }
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
  // append gateway payees (only CC supported at the moment)
  var cfg =
    payswarm.config.financial.paymentGateway.Payflow.payees
      .deposit['ccard:CreditCard'];
  var src = deposit.source;
  if(src.cardBrand in cfg) {
    jsonld.addValue(deposit, 'payee', cfg[src.cardBrand]);
  }
  else {
    jsonld.addValue(deposit, 'payee', cfg['default']);
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
  // withdrawal not presently supported
  return callback(new PaySwarmError(
    'Withdrawal is not supported by the Payflow gateway.',
    MODULE_TYPE + '.NotSupported'));
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
