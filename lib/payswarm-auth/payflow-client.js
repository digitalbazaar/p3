/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var https = require('https');
var jsonld = require('jsonld');
var util = require('util');
var URL = require('url');

// module API
var api = {};
module.exports = api;

var SANDBOX_URL = 'https://pilot-payflowpro.paypal.com';
// FIXME: uncomment once testing is done
//var LIVE_URL = 'https://payflowpro.paypal.com';

/**
 * Creates a new Payflow Pro client.
 *
 * @param options the options to use.
 *          mode: 'sandbox' or 'live'.
 *          [timeout]: the connection timeout in seconds (default: 45).
 *          user: the user ID of the user authorized to process transactions.
 *          vendor: the login ID created when the account was registered.
 *          partner: the ID provided by the PayPal Reseller, use 'PayPal' if
 *            the account was purchased directly from PayPal.
 *          password: the password defined when the account was registered.
 *          [debug]: true to write output to the console (default: false).
 *          [maxSockets]: the maximum number of sockets to use when sending
 *            requests (default: 5).
 */
api.PayflowClient = function(options) {
  // validate options
  options = options || {};
  if(options.mode !== 'sandbox' && options.mode !== 'live') {
    throw new Error(
      'Invalid Payflow client mode "' + options.mode + '", accepted modes: ' +
      '"sandbox", "live".');
  }
  if(!options.user) {
    throw new Error(
      'Invalid Payflow client "user" parameter "' + options.user + '".');
  }
  if(!options.vendor) {
    throw new Error(
      'Invalid Payflow client "vendor" parameter "' + options.vendor + '".');
  }
  if(!options.partner) {
    throw new Error(
      'Invalid Payflow client "partner" parameter "' + options.partner + '".');
  }
  if(!options.password) {
    throw new Error(
      'Invalid Payflow client "pwd" parameter "' + options.vendor + '".');
  }
  var url = (options.mode === 'live') ? LIVE_URL : SANDBOX_URL;
  this.options = {
    url: url,
    // paypal recommended timeout is 45 seconds
    timeout: options.timeout || 45,
    user: options.user,
    vendor: options.vendor,
    partner: options.partner,
    password: options.password,
    debug: options.debug
  };
  this.agent = new https.Agent();
  if('maxSockets' in options) {
    this.agent.maxSockets = options.maxSockets;
  }
};

/**
 * Creates and sends a verify request to the Payflow Pro Gateway. The
 * result given to the callback includes the response from the gateway
 * and a PaymentToken.
 *
 * @param source the payment source.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.verify = function(source, callback) {
  var self = this;
  var req = self.createVerifyRequest(source);
  self.send(req, function(err, res) {
    if(err) {
      return callback(err);
    }
    res.paymentToken = self.createPaymentToken(res);
    callback(null, res);
  });
};

/**
 * Creates and sends a charge request to the Payflow Pro Gateway.
 *
 * @param source the payment source.
 * @param amount the amount to charge.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.charge = function(source, amount, callback) {
  var self = this;
  var req = self.createChargeRequest(source, amount);
  self.send(req, callback);
};

/**
 * Creates and sends a credit request to the Payflow Pro Gateway.
 *
 * @param destination the payment destination.
 * @param options the options to use:
 *          [pnref] the optional original PNREF (gateway reference ID).
 *          [amount] the optional amount to credit.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.credit = function(destination, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var req = self.createCreditRequest(destination, options);
  self.send(req, callback);
};

/**
 * Creates and sends an inquiry request to the Payflow Pro Gateway.
 *
 * @param txn the Transaction to inquire about.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.inquire = function(txn, callback) {
  var self = this;
  var req = self.createInquiryRequest(txn);
  self.send(req, callback);
};

/**
 * Creates a verify request. This method does not perform the verification,
 * it only creates the request that can be given to send(). Once verified,
 * a PaymentToken can be generated from the response, stored, and later used
 * to create a charge request.
 *
 * @param source the source to be verified (CreditCard or BankAccount).
 *
 * @return the request.
 */
api.PayflowClient.prototype.createVerifyRequest = function(source) {
  var req = {};
  req.TRXTYPE = 'A';
  if(jsonld.hasValue(source, 'type', 'bank:BankAccount')) {
    req.PRENOTE = 'Y';
    req.AMT = '0.00';
  }
  else {
    req.AMT = '0';
    req.CURRENCY = 'USD';
  }
  return _methodToRequest(source, req);
};

/**
 * Creates a charge request. This method does not perform the charge,
 * it only creates the request that can be given to send().
 *
 * @param source the source to be charged.
 * @param amount the amount to charge.
 *
 * @return the request.
 */
api.PayflowClient.prototype.createChargeRequest = function(source, amount) {
  var req = {};
  req.TRXTYPE = 'S';
  if(!jsonld.hasValue(source, 'type', 'bank:BankAccount')) {
    req.CURRENCY = 'USD';
  }
  // FIXME: enforce maximum amount (10 digits + '.' = 11 chars)
  req.AMT = amount;
  return _methodToRequest(source, req);
};

/**
 * Creates a credit request. This method does not perform the credit,
 * it only creates the request that can be given to send().
 *
 * @param destination the payment destination.
 * @param options the options to use:
 *          [pnref] the optional original PNREF (gateway reference ID).
 *          [amount] the optional amount to credit.
 *
 * @return the request.
 */
api.PayflowClient.prototype.createCreditRequest = function(
  destination, options) {
  options = options || {};
  var req = {};
  req.TRXTYPE = 'C';
  if(!jsonld.hasValue(source, 'type', 'bank:BankAccount')) {
    req.CURRENCY = 'USD';
  }
  if('amount' in options) {
    // FIXME: enforce maximum amount (10 digits + '.' = 11 chars)
    req.AMT = options.amount;
  }
  return _methodToRequest(destination, req);
};

/**
 * Creates an inquiry request on the given Transaction. This method does not
 * perform the inquiry, it only creates the request that can be given to
 * send().
 *
 * @param txn the Transaction to inquire about.
 *
 * @return the request.
 */
api.PayflowClient.prototype.createInquiryRequest = function(txn) {
  var req = {};
  req.TRXTYPE = 'I';
  req.ORIGID = txn.psaGatewayRefId || '0';
  return req;
};

/**
 * Sends a request to the Payflow Pro Gateway.
 *
 * @param req the request to send.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.send = function(req, callback) {
  var self = this;

  // set auth info
  req.USER = self.options.user;
  req.VENDOR = self.options.vendor;
  req.PARTNER = self.options.partner;
  req.PWD = self.options.password;

  try {
    var encoded = _nvpEncode(req);
    if(self.options.debug) {
      console.log('[payflow-client] POST ' + self.options.url);
      console.log(encoded);
    }

    // post request
    var url = URL.parse(self.options.url);
    https.request({
      agent: self.agent,
      host: url.hostname,
      port: url.port || 443,
      method: 'POST',
      path: url.path,
      headers: {
        'Accept': 'text/namevalue',
        'Content-Type': 'text/namevalue',
        'Content-Length': Buffer.byteLength(encoded),
        'Connection': 'close',
        // unique request ID
        'X-VPS-REQUEST-ID': _generateRequestId(),
        'X-VPS-CLIENT-TIMEOUT': self.options.timeout
        // TODO: add product name (and version?)
        /*
        'X-VPS-VIT-INTEGRATION-PRODUCT': 'Product',
        'X-VPS-VIT-INTEGRATION-VERSION': '1.0',
        */
      }
    }, function(res) {
      if(res.statusCode >= 400) {
        return callback(new Error('Received HTTP error ' +
        'status "' + response.statusCode + '"'));
      }
      var body = '';
      res.on('data', function(data) {
        body += data.toString();
      });
      res.on('end', function() {
        /* When VERBOSITY=LOW (the default), the response variables are:
         * RESULT, PNREF, RESPMSG, AUTHCODE, AVSADDR, AVSZIP, CVV2MATCH,
         * IAVS, CARDSECURE, DUPLICATE
         */
        if(self.options.debug) {
          console.log('[payflow-client] Gateway response:');
          console.log(body);
        }
        var result = _nvpDecode(body || '');
        if(self.options.debug) {
          console.log('[payflow-client] Parsed response:');
          console.log(JSON.stringify(result, null, 2));
        }
        // FIXME: if RESULT < 0 indicates a communication error, no
        // transaction was attempted
        // RESULT == 0 means no errors occurred
        // RESULT > 0 means decline or error
        callback(null, {response: result});
      });
      res.on('error', callback);
    })
    .on('error', callback)
    .end(encoded);
  }
  catch(ex) {
    callback(ex);
  }
};

/**
 * Creates a PaymentToken from the given source and response (the result
 * from calling send()).
 *
 * @param source the original payment source.
 * @param res the response to the verification or charge of the source.
 *
 * @return the PaymentToken.
 */
api.PayflowClient.prototype.createPaymentToken = function(source, res) {
  var token = null;
  if(res.response.RESULT === '0') {
    token = {};
    token['@context'] = 'http://purl.org/payswarm/v1';
    token.type = 'com:PaymentToken';
    token.paymentToken = res.response.PNREF;
    if(jsonld.hasValue(source, 'type', 'ccard:CreditCard')) {
      token.paymentMethod = 'ccard:CreditCard';
      token.cardBrand = source.cardBrand;
      token.cardExpMonth = source.cardExpMonth;
      token.cardExpYear = source.cardExpYear;
      // mask
      token.cardNumber = source.cardNumber.replace(/.{1}(?=.{4})/g, '*');
    }
    else if(jsonld.hasValue(source, 'type', 'bank:BankAccount')) {
      token.paymentMethod = 'bank:BankAccount';
      token.bankAccountType = source.bankAccountType;
      // mask
      token.bankAccount = source.bankAccount.replace(/.{1}(?=.{4})/g, '*');
      token.bankRoutingNumber =
        source.bankRoutingNumber.replace(/.{1}(?=.{4})/g, '*');
    }
  }
  return token;
};

/**
 * Encodes an object as a PARMLIST using PayPal's NVP format. PayPal PARMLISTs
 * are not 'application/x-www-form-urlencoded', but use a similar encoding
 * called 'text/namevalue'. When the '&' or '=' characters appear in a value,
 * then the name of the value must use a 'length tag'. This means:
 * NAME[LENGTH_TAG]=VALUE. This is done instead of URL encoding. The other
 * difference is that double quote characters are prohibited.
 *
 * @param obj the object to NVP encode (usually a request body).
 *
 * @return the encoded result.
 */
function _nvpEncode(obj) {
  var parmlist = [];
  for(var name in obj) {
    var value = obj[name];

    // '&', '=', '"' are illegal in names
    if(/&|=|"/.test(name)) {
      throw new Error('Invalid name "' + name + '" in PayPal NVP PARMLIST.');
    }
    // '"' is illegal in values
    if(value.indexOf('"') !== -1) {
      throw new Error('Invalid value "' + value + '" in PayPal NVP PARMLIST');
    }

    // use length tags if value contains '&' or '='
    if(/&|=/.test(value)) {
      parmlist.push(util.format('%s[%d]=%s', name, value.length, value));
    }
    // simple encoding
    else {
      parmlist.push(name + '=' + value);
    }
  }
  return parmlist.join('&');
}

/**
 * Decodes a PayPal NVP-encoded PARMLIST into an object.
 *
 * @param str the encoded PARMLIST input (usually a response body).
 *
 * @return the decoded result.
 */
function _nvpDecode(str) {
  var rval = {};

  // parse PARMLIST
  var tokens = str.split('&');
  while(tokens.length > 0) {
    var token = tokens.shift();
    var equals = token.indexOf('=');
    if(equals === -1) {
      throw new Error('PayPal NVP PARMLIST ParseError: missing "=".');
    }

    // parse NAME=VALUE or NAME[LENGTH]=VALUE
    var name = token.substr(0, equals);
    var value = token.substr(equals + 1);
    var length = value.length;

    // parse length tag
    var startBracket = name.indexOf('[');
    if(startBracket !== -1) {
      name = name.substr(0, startBracket);
      var endBracket = name.indexOf(']');
      if(endBracket < startBracket) {
        throw new Error('PayPal NVP PARMLIST ParseError: invalid length tag.');
      }
      length = parseInt(name.substr(startBracket + 1, endBracket));
      if(isNaN(length)) {
        throw new Error('PayPal NVP PARMLIST ParseError: invalid length tag.');
      }

      // append subsequent tokens until length is met
      while(length > value.length) {
        if(tokens.length === 0) {
          throw new Error('PayPal NVP PARMLIST ParseError: value length ' +
            'does not match length tag.');
        }
        value += '&' + tokens.shift();
      }
    }

    // validate name
    if(name.length === 0) {
      throw new Error('PayPal NVP PARMLIST ParseError: zero-length name.');
    }
    // '&', '=', '"' are illegal in names
    if(/&|=|"/.test(name)) {
      throw new Error('PayPal NVP PARMLIST ParseError: invalid name ' +
        '"' + name + '".');
    }

    // validate value
    if(value.length !== length) {
      throw new Error('PayPal NVP PARMLIST ParseError: value length ' +
        'does not match length tag.');
    }
    // '"' is illegal in values
    if(value.indexOf('"') !== -1) {
      throw new Error('PayPal NVP PARMLIST ParseError: invalid value ' +
        '"' + value + '".');
    }

    if(Array.isArray(rval[name])) {
      rval[name].push(value);
    }
    else if(name in rval) {
      rval[name] = [rval[name], value];
    }
    else {
      rval[name] = value;
    }
  }

  return rval;
}

/**
 * Writes a payment method into a request.
 *
 * @param method the payment method (eg: PaymentToken, CreditCard, BankAccount).
 * @param req the request.
 *
 * @return the request.
 */
function _methodToRequest(method, req) {
  if(jsonld.hasValue(method, 'type', 'com:PaymentToken')) {
    _paymentTokenToRequest(method, req);
  }
  else if(jsonld.hasValue(method, 'type', 'ccard:CreditCard')) {
    _cardToRequest(method, req);
  }
  else if(jsonld.hasValue(method, 'type', 'bank:BankAccount')) {
    _bankAccountToRequest(method, req);
  }
  return req;
}

/**
 * Writes a PaymentToken into a Payflow Pro request.
 *
 * @param token the PaymentToken.
 * @param req the request to update.
 *
 * @return the request.
 */
function _paymentTokenToRequest(token, req) {
  // set tender type based on payment method
  if(jsonld.hasValue(token, 'paymentMethod', 'ccard:CreditCard')) {
    req.TENDER = 'C';
  }
  else if(jsonld.hasValue(token, 'paymentMethod', 'bank:BankAccount')) {
    req.TENDER = 'A';
    req.AUTHTYPE = 'WEB';
  }
  req.ORIGID = token.paymentToken;
  return req;
}

/**
 * Writes a CreditCard into a Payflow Pro request.
 *
 * @param card the CreditCard.
 * @param req the request to update.
 *
 * @return the request.
 */
function _cardToRequest(card, req) {
  var month = card.cardExpMonth.toString();
  var year = card.cardExpYear.toString().substr(2);
  if(card.cardExpMonth < 10) {
    month = '0' + month;
  }

  // tender 'C' is for credit
  req.TENDER = 'C';
  req.ACCT = card.cardNumber;
  req.EXPDATE = month + year;
  req.CVV2 = card.cardCvm;

  var address = card.address;
  // FIRSTNAME param includes full name
  req.FIRSTNAME = address.fullName.substr(0, 30);
  req.STREET = address.streetAddress;
  req.CITY = address.locality;
  req.STATE = address.region;
  req.ZIP = address.postalCode;
  req.BILLTOCOUNTRY = _getCountryCode(address.countryName);

  return req;
}

/**
 * Writes a BankAccount into a Payflow Pro request.
 *
 * @param account the BankAccount.
 * @param req the request to update.
 *
 * @return the request.
 */
function _bankAccountToRequest(account, req) {
  // tender 'A' is for ACH
  req.TENDER = 'A';
  req.AUTHTYPE = 'WEB';
  // FIRSTNAME param includes full name
  req.FIRSTNAME = account.address.fullName.substr(0, 30);
  req.ACCT = account.bankAccount;
  req.ABA = account.bankRoutingNumber;
  if(jsonld.hasValue(account, 'type', 'bank:SavingsAccount')) {
    req.ACCTTYPE = 'S';
  }
  else {
    // default to checking account
    req.ACCTTYPE = 'C';
  }

  return req;
}

/**
 * Generates a unique request ID.
 *
 * @return the unique request ID.
 */
function _generateRequestId() {
  var uuid = _uuid();
  var md = crypto.createHash('sha1');
  md.update(new Date().getTime().toString(), 'utf8');
  md.update(uuid, 'utf8');
  return md.digest('hex').substr(0, 32);
}

/**
 * Generates a v4 UUID.
 *
 * @return the UUID.
 */
function _uuid() {
  // taken from: https://gist.github.com/1308368
  return (function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;})();
}

/** ISO country codes */
var countryCodes = {
  'US': '840'
};

/**
 * Gets the ISO country code the Payflow gateway uses for the given country.
 *
 * @param country the 2-letter country code (eg: "US").
 *
 * @return the ISO country code (eg: for "US" the code is "840").
 */
function _getCountryCode(country) {
  var code = countryCodes[country];
  if(code === undefined) {
    throw new Error('Payments from the country "' + country + '" are not ' +
      'currently supported.');
  }
  return code;
}
