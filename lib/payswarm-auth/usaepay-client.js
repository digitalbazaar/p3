/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var soap = require('soap');
var path = require('path');

// module API
var api = {};
module.exports = api;

/**
 * Creates a new USAePay client.
 *
 * @param options the options to use.
 *          mode: 'sandbox' or 'live'.
 *          wsdlDir: the path to cached WSDLs.
 *          sourceKey: the key used to identify the merchant.
 *          [timeout]: the connection timeout in seconds (default: 45).
 *          [debug]: true to write output to the console (default: false).
 *          [maxSockets]: the maximum number of sockets to use when sending
 *            requests (default: 5).
 */
api.USAePayClient = function(options) {
  // validate options
  options = options || {};
  if(options.mode !== 'sandbox' && options.mode !== 'live') {
    throw new Error(
      'Invalid USAePay client mode "' + options.mode + '", accepted modes: ' +
      '"sandbox", "live".');
  }
  if(!options.wsdlDir) {
    throw new Error(
      'Invalid USAePay client "wsdlDir" parameter "' + options.wsdlDir + '".');
  }
  if(!options.sourceKey) {
    throw new Error(
      'Invalid USAePay client "sourceKey" parameter "' +
      options.sourceKey + '".');
  }
  var dir = path.resolve(options.wsdlDir);
  this.options = {
    url: path.join(dir, options.mode + '.usaepay.wsdl.xml'),
    sourceKey: options.sourceKey,
    // default timeout is 45 seconds
    timeout: options.timeout || 45,
    debug: options.debug
  };
  this.client = null;
  if('maxSockets' in options) {
    this.options.maxSockets = options.maxSockets;
  }
};

/**
 * Initializes the client by downloading the WSDL from the server and
 * creating the SOAP interface.
 *
 * @param callback(err) called once the operation completes.
 */
api.USAePayClient.prototype.init = function(callback) {
  var self = this;
  if(self.options.debug) {
    console.log('[usaepay-client] init: ' + this.options.url);
  }

  soap.createClient(self.options.url, function(err, client) {
    if(err) {
      return callback(err);
    }
    self.client = client;

    // FIXME: hack to set request options within soap library
    client.setSecurity({
      addOptions: function(opts) {
        opts.strictSSL = true;
        opts.timeout = self.options.timeout * 1000;
        opts.pool = {};
        if('maxSockets' in self.options) {
          opts.maxSockets = self.options.maxSockets;
        }
      },
      toXML: function() {return '';}
    });

    callback();
  });
};

/**
 * Creates and sends a verify request to the USAePay Gateway. The
 * result given to the callback includes the response from the gateway
 * and a PaymentToken.
 *
 * @param source the payment source.
 * @param options the options to use.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
api.USAePayClient.prototype.verify = function(source, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var args = {
    Token: _createSecurityToken(self.options.sourceKey, options),
    Params: {
      Command: 'authonly',
      IgnoreDuplicate: false,
      CheckData: {
        Routing: source.bankRoutingNumber,
        Account: source.bankAccount,
        AccountType: 'Checking'
      }
    }
  };

  if(self.options.debug) {
    console.log('[usaepay-client] verify: ' + JSON.stringify(args, null, 2));
  }

  self.client.runAuthOnly(args, function(err, result) {
    // protocol error
    if(err) {
      return callback(err);
    }

    var res = {};
    res.response = result.runAuthOnlyReturn;
    res.paymentToken = null;

    // gateway error
    if(res.response.ResultCode === 'E') {
      // FIXME: implement me
    }
    // transaction declined
    else if(res.response.ResultCode === 'D') {
      // FIXME:
    }
    // transaction approved
    else if(res.response.ResultCode === 'A') {
      var token = res.paymentToken = {};
      token['@context'] = 'http://purl.org/payswarm/v1';
      token.type = 'com:PaymentToken';
      token.paymentToken = res.response.RefNum;
      token.paymentMethod = 'bank:BankAccount';
      // mask all but last 3 digits
      token.bankAccount = source.bankAccount.replace(/.{1}(?=.{3})/g, '*');
      // FIXME: mask routing number?
      token.bankRoutingNumber = source.bankRoutingNumber;
    }

    if(self.options.debug) {
      console.log('[usaepay-client] verify response: ' +
        JSON.stringify(res, null, 2));
    }

    callback(null, res);
  });
};

/**
 * Creates and sends a charge request to the USAePay Gateway.
 *
 * @param source the payment source.
 * @param amount the amount to charge.
 * @param options the options to use.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
api.USAePayClient.prototype.charge = function(
  source, amount, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var args = {
    Token: _createSecurityToken(self.options.sourceKey, options),
    RefNum: source.paymentToken,
    Details: {
      Amount: amount,
      Currency: 'USD'
    },
    AuthOnly: false
  };

  if(self.options.debug) {
    console.log('[usaepay-client] charge: ' + JSON.stringify(args, null, 2));
  }

  self.client.runQuickSale(args, function(err, result) {
    // protocol error
    if(err) {
      return callback(err);
    }

    var res = {};
    res.response = result.runQuickSaleReturn;

    // gateway error
    if(res.response.ResultCode === 'E') {
      // FIXME: implement me
    }
    // transaction declined
    else if(res.response.ResultCode === 'D') {
      // FIXME:
    }
    // transaction approved
    else if(res.response.ResultCode === 'A') {
      // FIXME:
    }

    if(self.options.debug) {
      console.log('[usaepay-client] charge response: ' +
        JSON.stringify(res, null, 2));
    }

    callback(null, res);
  });
};

/**
 * Creates and sends a credit request to the USAePay Gateway.
 *
 * @param destination the payment destination.
 * @param amount the amount to credit.
 * @param options the options to use.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
api.USAePayClient.prototype.credit = function(
  destination, amount, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var args = {
    Token: _createSecurityToken(self.options.sourceKey, options),
    RefNum: destination.paymentToken,
    Details: {
      Amount: amount,
      Currency: 'USD'
    }
  };

  if(self.options.debug) {
    console.log('[usaepay-client] credit: ' + JSON.stringify(args, null, 2));
  }

  self.client.runQuickCredit(args, function(err, result) {
    // protocol error
    if(err) {
      return callback(err);
    }

    var res = {};
    res.response = result.runQuickCreditReturn;

    // gateway error
    if(res.response.ResultCode === 'E') {
      // FIXME: implement me
    }
    // transaction declined
    else if(res.response.ResultCode === 'D') {
      // FIXME:
    }
    // transaction approved
    else if(res.response.ResultCode === 'A') {
      // FIXME:
    }

    if(self.options.debug) {
      console.log('[usaepay-client] credit response: ' +
        JSON.stringify(res, null, 2));
    }

    callback(null, res);
  });
};

/**
 * Creates and sends an inquiry request to the USAePay Gateway.
 *
 * @param txn the Transaction to inquire about.
 * @param callback(err, res) called once the operation completes.
 */
api.USAePayClient.prototype.inquire = function(txn, callback) {
  var self = this;
  var args = {
    Token: _createSecurityToken(self.options.sourceKey, options),
    RefNum: txn.psaGatewayRefId,
    Fields: [
      'Status',
      'CheckTrace.Status',
      'CheckTrace.StatusCode',
      'CheckTrace.TrackingNum',
      'CheckTrace.Effective',
      'CheckTrace.Processed',
      'CheckTrace.Settled',
      'CheckTrace.Returned',
      'CheckTrace.ReturnCode',
      'CheckTrace.Reason',
      'CheckTrace.BankNote'
    ]
  };

  if(self.options.debug) {
    console.log('[usaepay-client] inquire: ' + JSON.stringify(args, null, 2));
  }

  self.client.getTransactionCustom(args, function(err, result) {
    // protocol error
    if(err) {
      return callback(err);
    }

    var res = {};

    // build response from fields
    res.response = {};
    result.getTransactionCustomReturn.FieldValue.forEach(function(field) {
      res.response[field.Field] = field.Value;
    });

    // FIXME: process res.response.StatusCode

    if(self.options.debug) {
      console.log('[usaepay-client] inquire response: ' +
        JSON.stringify(res, null, 2));
    }

    callback(null, res);
  });
};

/**
 * Creates a 'ueSecurityToken'.
 *
 * @param sourceKey the sourceKey to use.
 * @param options the options to use.
 *
 * @return the 'ueSecurityToken'.
 */
function _createSecurityToken(sourceKey, options) {
  var token = {SourceKey: sourceKey};
  if(options.ip) {
    token.ClientIP = options.ip;
  }
  return token;
}
