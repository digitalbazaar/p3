/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  tools: require('./tools')
};
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

// constants
var MODULE_TYPE = 'payswarm.paymentGateway';

// authority payment gateway module API
var api = {};
api.name = MODULE_TYPE + '.Authority';
api.gatewayName = 'Authority';
api.authorityOnly = true;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  callback(null);
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
  async.auto({
    hashSource: function(callback) {
      payswarm.tools.getTokenHash(source, callback);
    },
    blindSource: function(callback) {
      if(jsonld.hasValue(source, 'type', 'CreditCard')) {
        return callback(null, payswarm.tools.blindCreditCard(source));
      }
      if(jsonld.hasValue(source, 'type', 'BankAccount')) {
        return callback(null, payswarm.tools.blindBankAccount(source));
      }
      callback(null, bedrock.util.clone(source));
    }
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    var blinded = results.blindSource;
    token.paymentToken = results.hashSource;
    token.paymentGateway = api.gatewayName;
    token.paymentMethod = blinded.type;
    token.sysTokenHash = results.hashSource;
    if(!('sysVerified' in token) ||
      token.owner !== bedrock.config.authority.id) {
      token.sysVerified = (token.paymentMethod === 'CreditCard');
    }
    token.sysVerifyReady = token.sysVerified;
    if(jsonld.hasValue(source, 'type', 'CreditCard')) {
      token.cardBrand = blinded.cardBrand;
      token.cardNumber = blinded.cardNumber;
      token.cardExpMonth = blinded.cardExpMonth;
      token.cardExpYear = blinded.cardExpYear;
    } else if(jsonld.hasValue(source, 'type', 'BankAccount')) {
      token.bankAccount = blinded.bankAccount;
      token.bankRoutingNumber = blinded.bankRoutingNumber;
    }
    callback(null, token);
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
  logger.debug(api.name + ', charging deposit source...', deposit);

  // only payment tokens are permitted
  var source = deposit.source;
  if(!jsonld.hasValue(source, 'type', 'PaymentToken')) {
    return callback(new BedrockError(
      'Could not charge Deposit; unsupported source of funds.',
      MODULE_TYPE + '.UnsupportedSource'));
  }

  var result = {
    approved: true,
    errors: []
  };

  var refId = 'urn:authority-gateway:' + deposit.id;
  deposit.sysGatewayApprovalCode = 'Approved';
  deposit.sysGatewayRefId = refId;
  deposit.sysSettleAfter = +new Date();

  logger.debug(api.name + ', ' +
    'gateway approved="' + result.approved + '"', result);

  callback(null, result);
};

/**
 * Credits a customer's payment destination for a Withdrawal.
 *
 * If the payment destination was not approved, an error will be returned.
 *
 * @param withdrawal the Withdrawal with a payment destination, e.g. a
 *          PaymentToken.
 * @param amount the amount to withdraw into the external destination (can
 *          be different from the withdrawal total amount).
 * @param callback(err, result) called once the operation completes.
 */
api.creditWithdrawalDestination = function(withdrawal, amount, callback) {
  logger.debug(
    api.name + ', crediting withdrawal destination...',
    {withdrawal: withdrawal, amount: amount.toString()});

  // only payment tokens are permitted
  var destination = withdrawal.destination;
  if(!jsonld.hasValue(destination, 'type', 'PaymentToken')) {
    return callback(new BedrockError(
      'Could not process Withdrawal; unsupported destination for funds.',
      MODULE_TYPE + '.UnsupportedDestination'));
  }

  var result = {
    approved: true,
    errors: []
  };

  var refId = 'urn:authority-gateway:' + withdrawal.id;
  withdrawal.sysGatewayApprovalCode = 'Approved';
  withdrawal.sysGatewayRefId = refId;
  withdrawal.sysSettleAfter = +new Date();

  callback(null, result);
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
  logger.debug(api.name + ', inquiring about transaction...', txn);

  // always consider settled
  callback(null, {status: 'settled'});
};

/**
 * Adds Payees for this gateway to the given Deposit.
 *
 * @param deposit the Deposit to add Payees to.
 * @param callback(err, deposit) called once the operation completes.
 */
api.addDepositPayees = function(deposit, callback) {
  // no payees
  callback(null, deposit);
};

/**
 * Adds Payees for this gateway to the given Withdrawal.
 *
 * @param withdrawal the Withdrawal to add Payees to.
 * @param callback(err, withdrawal) called once the operation completes.
 */
api.addWithdrawalPayees = function(withdrawal, callback) {
  // no payees
  callback(null, withdrawal);
};

/**
 * Adjusts Transfers in the given Transaction for this gateway based on
 * the currency precision supported. This should be called immediately after
 * Transfer creation and is typically used to ensure that Transfer amounts or
 * the final Transaction amount has been appropriately rounded to account for
 * currency precision limitations.
 *
 * @param txn the Transaction to check/modify.
 * @param callback(null, txn) called once the operation completes.
 */
api.adjustTransactionPrecision = function(txn, callback) {
  // no adjustments necessary
  return callback(null, txn);
};

/**
 * Adjusts Transfers in the given Deposit for this gateway based on
 * the currency precision supported. This should be called immediately after
 * Transfer creation and is typically used to ensure that Transfer amounts or
 * the final Deposit amount has been appropriately rounded to account for
 * currency precision limitations.
 *
 * @param deposit the Deposit to check/modify.
 * @param callback(null, deposit) called once the operation completes.
 */
api.adjustDepositPrecision = function(deposit, callback) {
  // no adjustments necessary
  callback(null, deposit);
};

/**
 * Adjusts Transfers in the given Withdrawal for this gateway based on
 * the currency precision supported. This should be called immediately after
 * Transfer creation and is typically used to ensure that Transfer amounts or
 * the final Withdrawal amount has been appropriately rounded to account for
 * currency precision limitations.
 *
 * @param withdrawal the Withdrawal to check/modify.
 * @param callback(null, withdrawal) called once the operation completes.
 */
api.adjustWithdrawalPrecision = function(withdrawal, callback) {
  // no adjustments necessary
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
