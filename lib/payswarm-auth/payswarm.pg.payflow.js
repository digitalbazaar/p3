/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 *
 * This module provides an interface to the Payflow payment gateway.
 */
var async = require('async');
var payswarm = {
  logger: require('./payswarm.loggers').get('app'),
  tools: require('./payswarm.tools')
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
        api.client = new PayflowClient({
          mode: payswarm.payflow.config.mode,
          timeout: payswarm.payflow.config.timeout,
          user: payswarm.payflow.auth.user,
          vendor: payswarm.payflow.auth.vendor,
          partner: payswarm.payflow.auth.partner,
          password: payswarm.payflow.auth.password,
          debug: payswarm.payflow.config.debug
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
  // FIXME: for ACH, we will need to deposit funds into an account and then
  // get those numbers confirmed before permitting use of an account
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
      else {
        // FIXME: check AVS values, etc.

        /* VERIFIED response
        RESULT=0&PNREF=V79E1E4610CE&RESPMSG=Verified&AUTHCODE=010101&AVSADDR
        =Y&AVSZIP=Y&CVV2MATCH=Y&HOSTCODE=00&PROCAVS=Y&PROCCVV2=M&IAVS=N*/
      }
      if(err) {
        return callback(err);
      }
      if(res.paymentToken === null) {
        return callback(null, null);
      }
      token = payswarm.tools.extend(token, res.paymentToken);
      token.paymentGateway = api.gatewayName;
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

  // FIXME: for ACH, need to submit an "Inquiry" request to get the STATUS
  // of an ACH payment to see if it was returned R or if it passed, etc.
  // P02 = pending, P03 = submitted, P04 = pending retry, P05 = will not
  // settle (status for inquiry and voided payments), P06 = will not
  // settle (status for voided payments), P15 = rejected, bad ABA, etc.

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

      var err = null;
      // parse result code
      var rc = parseInt(res.response.RESULT);
      if(rc < 0) {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not charge Deposit payment source; a communication error ' +
          'occurred with the payment gateway. No attempt was made to charge ' +
          'the payment source.', {response: res});
      }
      else if(rc > 0) {
        result.errors.push('declined');
        err = new PaySwarmError(
          'Could not charge Deposit payment source; the payment gateway ' +
          'declined the payment source.', {response: res});
      }
      if(err) {
        return callback(err);
      }
      result.approved = true;
      result.response = res;
      // add auth approval code for receipt logs
      deposit.psaAuthorizationApprovalCode = res.AUTHCODE;
      callback(null, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    if(!result.approved) {
      err = new PaySwarmError(
        'Deposit charge not approved.',
        MODULE_TYPE + '.DepositNotApproved',
        {errors: result.errors}, err);
    }
    callback(err, result);
  });
};

/**
 * Blinds confidential information in a customer's deposit/payment source.
 *
 * @param deposit the Deposit with a payment source, e.g. CreditCard, to
 *          blind.
 * @param callback(err, blinded) called once the operation completes.
 */
api.blindDeposit = function(deposit, callback) {
  deposit.source = payswarm.tools.blindCreditCard(deposit.source);
  // remove signature from deposit
  delete deposit.signature;
  callback(null, deposit);
};
