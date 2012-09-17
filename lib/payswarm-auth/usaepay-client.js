/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
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
 *          pin: the pin for the merchant account.
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
  if(!options.pin) {
    throw new Error(
      'Invalid USAePay client "pin" parameter "' + options.pin + '".');
  }
  var dir = path.resolve(options.wsdlDir);
  this.options = {
    url: path.join(dir, options.mode + '.usaepay.wsdl.xml'),
    sourceKey: options.sourceKey,
    pin: options.pin,
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
 * Creates a PaymentToken for the given bank account.
 *
 * @param account the bank account.
 * @param callback(err, token) called once the operation completes.
 */
api.USAePayClient.prototype.tokenize = function(account, callback) {
  var self = this;

  // create token
  var token = {};
  token['@context'] = 'http://purl.org/payswarm/v1';
  token.type = 'com:PaymentToken';
  token.paymentMethod = 'bank:BankAccount';
  // mask
  token.bankAccount = account.bankAccount.replace(/.{1}(?=.{4})/g, '*');
  token.bankAccountType = account.bankAccountType || 'bank:Checking';
  token.bankRoutingNumber =
    account.bankRoutingNumber.replace(/.{1}(?=.{4})/g, '*');

  // remove 'bank:' prefix
  var accountType = account.bankAccountType ?
    account.bankAccountType.substr(5) : 'Checking';

  // parse out first and last names
  var address = account.address;
  var name = address.fullName.split(' ');
  var ln = name.pop();
  var fn = name.join(' ') || ln;

  async.waterfall([
    function(callback) {
      var args = {
        Token: _createSecurityToken(self.options.sourceKey, self.options.pin),
        CustomerData: {
          BillingAddress: {
            FirstName: fn,
            LastName: ln,
            Street: address.streetAddress,
            City: address.locality,
            State: address.region,
            Zip: address.postalCode,
            Country: address.countryName
          },
          // do not enable recurring billing
          Enabled: false
        }
      };

      if(self.options.debug) {
        console.log('[usaepay-client] addCustomer: ' +
          JSON.stringify(args, null, 2));
      }

      self.client.addCustomer(args, function(err, result) {
        // protocol error
        if(err) {
          return callback(err);
        }

        if(self.options.debug) {
          console.log('[usaepay-client] addCustomer result: ' +
            JSON.stringify(result, null, 2));
        }

        callback(null, result.addCustomerReturn);
      });
    },
    function(customerId, callback) {
      var args = {
        Token: _createSecurityToken(self.options.sourceKey, self.options.pin),
        CustNum: customerId,
        PaymentMethod: {
          MethodType: 'ACH',
          Account: account.bankAccount,
          AccountType: accountType,
          Routing: account.bankRoutingNumber
        },
        MakeDefault: true,
        Verify: false
      };

      if(self.options.debug) {
        console.log('[usaepay-client] addCustomerPaymentMethod: ' +
          JSON.stringify(args, null, 2));
      }

      self.client.addCustomerPaymentMethod(args, function(err, result) {
        // protocol error
        if(err) {
          return callback(err);
        }

        if(self.options.debug) {
          console.log('[usaepay-client] addCustomerPaymentMethod result: ' +
            JSON.stringify(result, null, 2));
        }

        var paymentMethodId = result.addCustomerPaymentMethodReturn;
        token.paymentToken = '' + customerId + ':' + paymentMethodId;
        callback();
      });
    }
  ], function(err) {
    callback(err, token);
  });
};

/**
 * Gets the bank account associated with a PaymentToken.
 *
 * @param token the PaymentToken to get the associated bank account for.
 * @param callback(err, account) called once the operation completes.
 */
api.USAePayClient.prototype.getBankAccount = function(token, callback) {
  var self = this;
  var split = token.paymentToken.split(':');

  var args = {
    Token: _createSecurityToken(self.options.sourceKey, self.options.pin),
    CustNum: split[0],
    MethodID: split[1]
  };

  if(self.options.debug) {
    console.log('[usaepay-client] getCustomerPaymentMethod: ' +
      JSON.stringify(args, null, 2));
  }

  self.client.getCustomerPaymentMethod(args, function(err, result) {
    // protocol error
    if(err) {
      return callback(err);
    }

    if(self.options.debug) {
      console.log('[usaepay-client] getCustomerPaymentMethod result: ' +
        JSON.stringify(result, null, 2));
    }

    var paymentMethod = result.getCustomerPaymentMethodReturn;

    var account = {};
    account.type = 'bank:BankAccount';
    account.bankAcount = paymentMethod.Account;
    account.bankAcountType = paymentMethod.AccountType;
    account.bankRoutingNumber = paymentMethod.Routing;
    callback(null, account);
  });
};

/**
 * Runs a charge transaction on the USAePay Gateway.
 *
 * @param token the PaymentToken.
 * @param amount the amount to charge.
 * @param options the options to use.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
api.USAePayClient.prototype.charge = function(
  token, amount, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  _runTransaction(this, 'Check', token, amount, options, callback);
};

/**
 * Runs a credit transaction on the USAePay Gateway.
 *
 * @param token the PaymentToken.
 * @param amount the amount to credit.
 * @param options the options to use.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
api.USAePayClient.prototype.credit = function(
  token, amount, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  _runTransaction(this, 'CheckCredit', token, amount, options, callback);
};

/**
 * Runs an inquiry on the USAePay Gateway.
 *
 * @param txn the Transaction to inquire about.
 * @param callback(err, res) called once the operation completes.
 */
api.USAePayClient.prototype.inquire = function(txn, callback) {
  var self = this;
  var args = {
    Token: _createSecurityToken(self.options.sourceKey, self.options.pin),
    RefNum: txn.psaGatewayRefId
  };

  if(self.options.debug) {
    console.log('[usaepay-client] inquire: ' + JSON.stringify(args, null, 2));
  }

  self.client.getTransaction(args, function(err, result) {
    // protocol error
    if(err) {
      return callback(err);
    }

    var res = result.getTransactionReturn;

    if(self.options.debug) {
      console.log('[usaepay-client] inquire response: ' +
        JSON.stringify(res, null, 2));
    }

    callback(null, res);
  });
};

/**
 * Runs a transaction on the USAePay Gateway.
 *
 * @param self the USAePayClient instance to use.
 * @param command the command to run ('Check' or 'CheckCredit').
 * @param token the PaymentToken.
 * @param amount the transaction amount.
 * @param options the options to use.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
function _runTransaction(
  self, command, token, amount, options, callback) {
  var split = token.paymentToken.split(':');
  var args = {
    Token: _createSecurityToken(
      self.options.sourceKey, self.options.pin, options),
    CustNum: split[0],
    PaymentMethodID: split[1],
    Parameters: {
      Command: command,
      Details: {
        Amount: amount,
        Currency: 'USD'
      }
    }
  };

  if(self.options.debug) {
    console.log('[usaepay-client] ' + command + ': ' +
      JSON.stringify(args, null, 2));
  }

  self.client.runCustomerTransaction(args, function(err, result) {
    // protocol error
    if(err) {
      return callback(err);
    }

    var res = result.runCustomerTransactionReturn;

    if(self.options.debug) {
      console.log('[usaepay-client] ' + command + ' response: ' +
        JSON.stringify(res, null, 2));
    }

    callback(null, res);
  });
};

/**
 * Creates a 'ueSecurityToken'.
 *
 * @param sourceKey the sourceKey to use.
 * @param pin the pin to use.
 * @param options the options to use.
 *
 * @return the 'ueSecurityToken'.
 */
function _createSecurityToken(sourceKey, pin, options) {
  var token = {SourceKey: sourceKey};

  // generate hash
  var seed = (+new Date()) + '' + Math.floor(Math.random() *  100000);
  var md = crypto.createHash('sha1');
  md.update(sourceKey + seed + pin, 'utf8');
  token.PinHash = {
    Type: 'sha1',
    Seed: seed,
    HashValue: md.digest('hex')
  };

  // add IP if given
  if(options && options.ip) {
    token.ClientIP = options.ip;
  }

  return token;
}
