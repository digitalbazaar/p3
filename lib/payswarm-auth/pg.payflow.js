/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * This module provides an interface to the Payflow payment gateway.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: require('../config'),
  logger: bedrock.loggers.get('app'),
  money: require('./money'),
  tools: require('./tools')
};
var Money = payswarm.money.Money;
var PayflowClient = require('./payflow-client').PayflowClient;
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.paymentGateway';

// payment gateway module API
var api = {};
api.name = MODULE_TYPE + '.Payflow';
api.gatewayName = 'Payflow';
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
  async.auto({
    hashSource: function(callback) {
      payswarm.tools.getTokenHash(source, callback);
    },
    verifySource: function(callback) {
      api.client.verify(source, callback);
    },
    finish: ['hashSource', 'verifySource', function(callback, results) {
      var err = null;
      // parse result code
      var res = results.verifySource;
      var rc = parseInt(res.response.RESULT, 10);
      if(rc < 0) {
        err = new PaySwarmError(
          'Could not create PaymentToken; a communication error occurred ' +
          'with the payment gateway. No attempt was made to verify the ' +
          'payment source.',
          MODULE_TYPE + '.CommunicationError', {response: res});
      } else if(rc > 0) {
        err = new PaySwarmError(
          'Could not create PaymentToken; the payment gateway declined ' +
          'the payment source.',
          MODULE_TYPE + '.Declined', {response: res});
      }
      // check AVS and CVV2 values
      else if(
        res.response.AVSADDR !== 'Y' || res.response.AVSZIP !== 'Y' ||
        res.response.CVV2MATCH !== 'Y') {
        err = new PaySwarmError(
          'Could not create PaymentToken; the associated address and/or ' +
          'card security code could not be verified.',
          MODULE_TYPE + '.NotVerified', {response: res});
      }

      if(err) {
        // top-level client-side error
        if(err.name !== MODULE_TYPE + '.CommunicationError') {
          err = new PaySwarmError(
            'The payment method could not be verified. Please ensure that ' +
            'the information you entered is correct and try again.',
            MODULE_TYPE + '.CreateError',
            {'public': true, httpStatusCode: 400}, err);
        }
        return callback(err);
      }
      if(res.paymentToken === null) {
        return callback(null, null);
      }
      token = payswarm.tools.extend(token, res.paymentToken);
      token.psaTokenHash = results.hashSource;
      token.paymentGateway = api.gatewayName;
      token.psaVerified = (token.paymentMethod === 'CreditCard');
      token.psaVerifyReady = token.psaVerified;
      callback(null, token);
    }]
  }, function(err, results) {
    callback(_convertClientError(err), results.finish);
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
      // parse result code
      var rc = parseInt(res.response.RESULT, 10);
      if(rc < 0) {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not charge Deposit payment source; a communication error ' +
          'occurred with the payment gateway. No attempt was made to charge ' +
          'the payment source.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      } else if(rc > 0) {
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
      deposit.psaGatewayApprovalCode = res.response.AUTHCODE;
      deposit.psaGatewayRefId = res.response.PNREF;
      deposit.psaGatewayOperation = 'charge';
      callback(null, result);
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
    callback(_convertClientError(err), result);
  });
};

/**
 * Places funds from a customer's payment source on hold for a Deposit. A
 * customer's payment source may be approved even if there are some errors,
 * like all AVS (address verification service) checks did not pass, e.g. their
 * zip and/or their address was incorrect. This information will be returned in
 * the result.
 *
 * If a hold on the funds from the payment source was not approved, an error
 * will be returned.
 *
 * @param deposit the Deposit with a payment source, e.g. a PaymentToken.
 * @param callback(err, result) called once the operation completes.
 */
api.holdDepositFunds = function(deposit, callback) {
  payswarm.logger.debug(
    api.name + ', placing deposit source funds on hold...', deposit);

  // clear any existing errors, initialize
  var result = {
    approved: false,
    response: null,
    errors: []
  };

  var source = deposit.source;
  async.waterfall([
    function(callback) {
      api.client.hold(
        source, deposit.amount, {transactionId: deposit.id}, callback);
    },
    function(res, callback) {
      payswarm.logger.debug(api.name + ', gateway hold result',
        {response: res, deposit: deposit});
      result.response = res;

      var err = null;
      // parse result code
      var rc = parseInt(res.response.RESULT, 10);
      if(rc < 0) {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not place Deposit payment source funds on hold; a ' +
          'communication error occurred with the payment gateway. No ' +
          'attempt was made to hold the payment source funds.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      } else if(rc > 0) {
        result.errors.push('declined');
        err = new PaySwarmError(
          'Could not place Deposit payment source funds on hold; the ' +
          'payment gateway declined the payment source.',
          MODULE_TYPE + '.Declined', {result: result});
      }
      if(err) {
        return callback(err);
      }
      result.approved = true;
      // add auth approval code for receipt logs
      deposit.psaGatewayApprovalCode = res.response.AUTHCODE;
      deposit.psaGatewayRefId = res.response.PNREF;
      deposit.psaGatewayOperation = 'hold';
      callback(null, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    // handle gateway client-level error
    if(!result.approved && result.errors.length === 0) {
      err = new PaySwarmError(
        'A hold on deposit payment source funds was not approved.',
        MODULE_TYPE + '.DepositFundsHoldNotApproved',
        {result: result}, err);
    }
    callback(_convertClientError(err), result);
  });
};

/**
 * Captures funds from a customer's payment source for a Deposit that were
 * previously placed on hold. A customer's payment source may be approved even
 * if there are some errors, like all AVS (address verification service) checks
 * did not pass, e.g. their zip and/or their address was incorrect. This
 * information will be returned in the result.
 *
 * If the capture was not approved, an error will be returned.
 *
 * @param deposit the Deposit with a previously set psaGatewayRefId.
 * @param options the options to use.
 *          amount the amount to capture (can be different from the deposit
 *            total amount).
 * @param callback(err, result) called once the operation completes.
 */
api.captureDepositFunds = function(deposit, options, callback) {
  payswarm.logger.debug(
    api.name + ', capturing funds previously held from deposit source...',
    deposit);

  if(typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || {};

  // clear any existing errors, initialize
  var result = {
    approved: false,
    response: null,
    errors: []
  };

  var source = deposit.source;
  async.waterfall([
    function(callback) {
      api.client.capture(deposit, options, callback);
    },
    function(res, callback) {
      payswarm.logger.debug(api.name + ', gateway capture result',
        {response: res, deposit: deposit});
      result.response = res;

      var err = null;
      // parse result code
      var rc = parseInt(res.response.RESULT, 10);
      if(rc < 0) {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not capture Deposit payment source funds; a ' +
          'communication error occurred with the payment gateway. No ' +
          'attempt was made to capture the held payment source funds.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      } else if(rc > 0) {
        result.errors.push('declined');
        err = new PaySwarmError(
          'Could not capture Deposit payment source funds; the ' +
          'payment gateway declined the payment source.',
          MODULE_TYPE + '.Declined', {result: result});
      }
      if(err) {
        return callback(err);
      }
      result.approved = true;
      // add auth approval code for receipt logs
      deposit.psaGatewayApprovalCode = res.response.AUTHCODE;
      deposit.psaGatewayRefId = res.response.PNREF;
      deposit.psaGatewayOperation = 'capture';
      callback(null, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    // handle gateway client-level error
    if(!result.approved && result.errors.length === 0) {
      err = new PaySwarmError(
        'A capture on held deposit payment source funds was not approved.',
        MODULE_TYPE + '.DepositFundsCaptureNotApproved',
        {result: result}, err);
    }
    callback(_convertClientError(err), result);
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
  // return early for now, withdrawal not presently supported
  return callback(new PaySwarmError(
    'Withdrawal is not supported by the Payflow gateway.',
    MODULE_TYPE + '.NotSupported'));
  /*
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
        destination, {amount: amount, transactionId: withdrawal.id},
        callback);
    },
    function(res, callback) {
      payswarm.logger.debug(api.name + ', gateway credit result',
        {response: res, withdrawal: withdrawal});
      result.response = res;

      var err = null;
      // parse result code
      var rc = parseInt(res.response.RESULT, 10);
      if(rc < 0) {
        result.errors.push('unprocessed');
        err = new PaySwarmError(
          'Could not credit Withdrawal payment destination; a communication ' +
          'error occurred with the payment gateway. No attempt was made to ' +
          'credit the payment destination.',
          MODULE_TYPE + '.CommunicationError', {result: result});
      } else if(rc > 0) {
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
      withdrawal.psaGatewayApprovalCode = res.response.AUTHCODE;
      withdrawal.psaGatewayRefId = res.response.PNREF;
      withdrawal.psaGatewayOperation = 'credit';
      callback(null, result);
    }
  ], function(err) {
    payswarm.logger.debug(api.name + ', ' +
      'gateway approved="' + result.approved + '"', result);

    // handle gateway client-level error
    if(!result.approved && result.errors.length === 0) {
      err = new PaySwarmError(
        'The withdrawal was not approved.',
        MODULE_TYPE + '.WithdrawalNotApproved',
        {result: result}, err);
    }
    callback(_convertClientError(err), result);
  });
  */
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

  if(isDeposit) {
    // funds held, must be captured
    var held = jsonld.hasValue(txn, 'psaGatewayOperation', 'hold');
    if(held) {
      // do capture
      return api.captureDepositFunds(txn, function(err, res) {
        var result = {
          status: 'settled',
          response: res,
          errors: [],
          settleAfterIncrement: payswarm.config.financial.paymentGateway.Payflow
            .creditCardStatusSettleAfterIncrement
        };

        if(err) {
          result.status = 'error';
          result.errors.push(err);
        }

        callback(null, result);
      });
    }

    // consider credit card deposits without approved 'hold' to be
    // externally settled
    var src = txn.source;
    if(jsonld.hasValue(src, 'paymentMethod', 'CreditCard') ||
      jsonld.hasValue(src, 'type', 'CreditCard')) {
      return callback(null, {status: 'settled'});
    }
  }

  // do inquiry
  api.client.inquire(txn, function(err, res) {
    var result = {
      status: 'pending',
      response: res,
      errors: [],
      settleAfterIncrement: payswarm.config.financial.paymentGateway.Payflow
        .bankAccountStatusSettleAfterIncrement
    };

    // parse result code
    var rc = parseInt(res.response.RESULT, 10);
    if(rc < 0) {
      result.status = 'error';
      result.errors.push('unprocessed');
    } else if(rc > 0) {
      result.status = 'voided';
    } else if(!res.response.STATUS ||
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
    payswarm.config.financial.paymentGateway.Payflow.payees.deposit.CreditCard;
  var src = deposit.source;
  if(src.cardBrand in cfg) {
    jsonld.addValue(deposit, 'payee', cfg[src.cardBrand]);
  } else {
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
    var roundingAccount = payswarm.config.financial.paymentGateway.Payflow
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
    var roundingAccount = payswarm.config.financial.paymentGateway.Payflow
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

/**
 * Converts a payflow client error to a PaySwarmError.
 *
 * @param err the error to convert.
 */
function _convertClientError(err) {
  if(!err) {
    return null;
  }
  if(err instanceof PaySwarmError) {
    return err;
  }
  if(err.name === 'UnsupportedCountry') {
    err = new PaySwarmError(
      err.message, MODULE_TYPE + '.UnsupportedCountry',
      {'public': true, httpStatusCode: 400});
  } else {
    err = new PaySwarmError(
      err.message, MODULE_TYPE + '.Error', null);
  }
  return err;
}
