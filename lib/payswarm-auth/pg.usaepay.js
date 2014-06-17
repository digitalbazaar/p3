/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * This module provides an interface to the USAePay payment gateway.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  logger: require('./loggers').get('app'),
  money: require('./money'),
  tools: require('./tools')
};
var Money = payswarm.money.Money;
var PaySwarmError = payswarm.tools.PaySwarmError;
var USAePayClient = require('./usaepay-client').USAePayClient;

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
  async.auto({
    hashSource: function(callback) {
      payswarm.tools.getTokenHash(source, callback);
    },
    tokenize: function(callback) {
      api.client.tokenize(source, callback);
    },
    finish: ['hashSource', 'tokenize', function(callback, results) {
      var paymentToken = results.tokenize;
      token = payswarm.tools.extend(token, paymentToken);
      token.psaTokenHash = results.hashSource;
      token.paymentGateway = api.gatewayName;
      token.psaVerified = false;
      token.psaVerifyReady = false;
      callback(null, token);
    }]
  }, function(err, results) {
    if(err) {
      err = new PaySwarmError(
        'The payment method was declined. Please ensure that the ' +
        'information you entered is correct and try again.',
        MODULE_TYPE + '.CreateError',
        {'public': true, httpStatusCode: 400}, err);
    }
    callback(err, results.finish);
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
      api.client.charge(
        source, deposit.amount, {transactionId: deposit.id}, callback);
    },
    function(res, callback) {
      payswarm.logger.debug(api.name + ', gateway charge result',
        {response: res, deposit: deposit});
      result.response = res;

      var err = null;

      // gateway error
      if(res.ResultCode === 'E') {
        // FIXME: this error type also occurs when routing number is bad
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
        deposit.psaGatewayOperation = 'charge';
      }
      callback(err, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    // handle gateway client-level error
    if(!result.approved && result.errors.length === 0) {
      err = new PaySwarmError(
        'The deposit was not approved.',
        MODULE_TYPE + '.DepositNotApproved',
        {result: result}, err);
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
 * @param amount the amount to withdraw into the external destination (can
 *          be different from the withdrawal total amount).
 * @param callback(err, result) called once the operation completes.
 */
api.creditWithdrawalDestination = function(withdrawal, amount, callback) {
  payswarm.logger.debug(
    api.name + ', crediting withdrawal destination...',
    {withdrawal: withdrawal, amount: amount.toString()});

  // ensure amount uses external money
  amount = payswarm.money.createStingyMoney(amount).toString();

  // clear any existing errors, initialize
  var result = {
    approved: false,
    response: null,
    errors: []
  };

  var destination = withdrawal.destination;
  async.waterfall([
    function(callback) {
      api.client.credit(
        destination, amount, {transactionId: withdrawal.id}, callback);
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
        deposit.psaGatewayOperation = 'credit';
      }
      callback(err, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    if(result.approved &&
      (jsonld.hasValue(destination, 'type', 'BankAccount') ||
      jsonld.hasValue(destination, 'paymentMethod', 'BankAccount'))) {
      // set bank account settlement
      withdrawal.psaSettleAfter = (+new Date() +
        payswarm.config.financial.paymentGateway.USAePay.bankAccountSettlement);
    }

    // handle gateway client-level error
    if(!result.approved && result.errors.length === 0) {
      err = new PaySwarmError(
        'The withdrawal was not approved.',
        MODULE_TYPE + '.WithdrawalNotApproved',
        {result: result}, err);
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

  var isDeposit = jsonld.hasValue(txn, 'type', 'Deposit');
  var isWithdrawal = jsonld.hasValue(txn, 'type', 'Withdrawal');
  if(!(isDeposit || isWithdrawal)) {
    // always consider non-deposit/non-withdrawals to be externally settled
    return callback(null, {status: 'settled'});
  }

  // do inquiry
  api.client.inquire(txn, function(err, res) {
    var result = {
      status: 'error',
      response: res,
      errors: [],
      settleAfterIncrement: payswarm.config.financial.transaction
        .statusSettleAfterIncrement
    };

    if(err) {
      err = new PaySwarmError(
        'Could not inquire about transaction.',
        MODULE_TYPE + '.InquireError',
        {transactionId: txn.id, result: result}, err);
      payswarm.logger.error(
        api.name + ', transction inquiry error', {error: err});
      return callback(err, result);
    }

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
  // get rounded total by rounding each transfer based on gateway's precision
  // rounding up to ensure sufficient funds are pulled
  var roundedTotal = payswarm.money.createGenerousMoney();
  var transfers = jsonld.getValues(deposit, 'transfer');
  for(var i = 0; i < transfers.length; ++i) {
    var transfer = transfers[i];
    var amount = payswarm.money.createGenerousMoney(transfer.amount);
    roundedTotal = roundedTotal.add(amount);
  }

  // add currency rounding transfer if rounded total > total
  var total = new Money(deposit.amount);
  if(roundedTotal.compareTo(total) > 0) {
    var roundingAccount = payswarm.config.financial.paymentGateway.USAePay
      .roundingAdjustmentAccount;
    jsonld.addValue(deposit, 'transfer', {
      type: 'Transfer',
      source: deposit.source.id,
      destination: roundingAccount,
      amount: new Money(roundedTotal).subtract(total).toString(),
      currency: deposit.currency,
      comment: 'Currency precision rounding adjustment'
    });
  }

  // set new rounded total
  deposit.amount = new Money(roundedTotal).toString();
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
  // get rounding error by rounding each transfer that isn't to the
  // withdrawal destinatino based on the gateway's precision;
  // rounding up to ensure sufficient funds are pulled
  var total = Money.ZERO;
  var roundingError = Money.ZERO;
  var transfers = jsonld.getValues(withdrawal, 'transfer');
  var externalTransfer = null;
  for(var i = 0; i < transfers.length; ++i) {
    var transfer = transfers[i];
    var amount = new Money(transfer.amount);
    if(transfer.destination === withdrawal.destination.id) {
      // save external transfer (assume only one)
      externalTransfer = transfer;
      continue;
    }

    // be generous; amount collected must be sufficient for fees
    var min = payswarm.money.createGenerousMoney(transfer.amount);
    roundingError = roundingError.add(new Money(min).subtract(amount));
    total = total.add(transfer.amount);
  }

  // remove rounding error from the external transfer
  var amount = new Money(externalTransfer.amount);
  if(!roundingError.isZero()) {
    amount = amount.subtract(roundingError);
  }

  // round withdrawal amount to gateway's precision;
  // be stingy as it can't be more than the requested amount
  var max = payswarm.money.createStingyMoney(amount);
  roundingError = roundingError.add(amount.subtract(max));
  // set new rounded amount and add to the total
  externalTransfer.amount = new Money(max).toString();
  total = total.add(externalTransfer.amount);

  // add currency rounding transfer if roundingError is not zero
  if(!roundingError.isZero()) {
    var roundingAccount = payswarm.config.financial.paymentGateway.USAePay
      .roundingAdjustmentAccount;
    jsonld.addValue(withdrawal, 'transfer', {
      type: 'Transfer',
      source: withdrawal.source,
      destination: roundingAccount,
      amount: roundingError.toString(),
      currency: withdrawal.currency,
      comment: 'Currency precision rounding adjustment'
    });
    // add rounding error to total
    total = total.add(roundingError);
  }

  // set new total
  withdrawal.amount = total.toString();
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
