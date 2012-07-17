/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var jsonld = require('jsonld');
var request = require('request');
var util = require('util');

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
};

/**
 * Sends a request to the associated Payflow Pro Gateway.
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
    request.post({
      headers: {
        'Accept': 'text/namevalue',
        'Content-Type': 'text/namevalue',
        // unique request ID
        'X-VPS-REQUEST-ID': _getRequestId(),
        'X-VPS-CLIENT-TIMEOUT': self.options.timeout
        // TODO: add product name (and version?)
        /*
        'X-VPS-VIT-INTEGRATION-PRODUCT': 'Product',
        'X-VPS-VIT-INTEGRATION-VERSION': '1.0'
        */
      },
      url: self.options.url,
      body: encoded,
      strictSSL: true,
      jar: false,
      // wait 10 seconds longer than server timeout time
      timeout: self.options.timeout + (1000 * 10)
    }, function(err, response, body) {
      if(!err && response.statusCode >= 400) {
        err = new Error('[payflow-client] Error: received HTTP error ' +
          'status "' + response.statusCode + '"');
      }
      if(err) {
        return callback(err);
      }
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
        console.log('[payflow-client] Parsed response:' +
          JSON.stringify(result, null, 2));
      }
      callback(null, result);
    });
  }
  catch(ex) {
    callback(ex);
  }
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
 * Writes a PaymentToken into a Payflow Pro request.
 *
 * @param token the PaymentToken.
 * @param req the request to update.
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
}

/**
 * Writes a CreditCard into a Payflow Pro request.
 *
 * @param card the CreditCard.
 * @param req the request to update.
 */
function _cardToRequest(card, req) {
  // tender 'C' is for credit
  req.TENDER = 'C';
  req.ACCT = card.number;
  req.EXPDATE = card.expMonth + card.expYear;
  req.CVV2 = card.cvm;

  var address = card.address;
  // FIRSTNAME param includes full name
  req.FIRSTNAME = address.fullName.substr(30);
  req.STREET = address.streetAddress;
  req.CITY = address.locality;
  req.STATE = address.region;
  req.ZIP = address.postalCode;
  req.BILLTOCOUNTRY = _getCountryCode(address.countryName);
}

/**
 * Writes a BankAccount into a Payflow Pro request.
 *
 * @param account the BankAccount.
 * @param req the request to update.
 */
function _bankAccountToRequest(account, req) {
  // tender 'A' is for ACH
  req.TENDER = 'A';
  req.AUTHTYPE = 'WEB';
  // FIRSTNAME param includes full name
  req.FIRSTNAME = account.address.fullName.substr(30);
  req.ACCT = account.bankAccount;
  req.ABA = account.bankRouting;
  if(jsonld.hasValue(account, 'type', 'bank:CheckingAccount')) {
    req.ACCTTYPE = 'C';
  }
  else {
    // default to savings account
    req.ACCTTYPE = 'S';
  }
}

/**
 * Generates a unique request ID.
 *
 * @return the unique request ID.
 */
function _getRequestId() {
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
}
