/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var crypto = require('crypto');
var https = require('https');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var util = require('util');
var URL = require('url');

// module API
var api = {};
module.exports = api;

var SANDBOX_URL = 'https://pilot-payflowpro.paypal.com';
var LIVE_URL = 'https://payflowpro.paypal.com';

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
  var req;
  try {
    req = self.createVerifyRequest(source);
  } catch(ex) {
    return callback(ex);
  }
  self.send(req, function(err, res) {
    if(err) {
      return callback(err);
    }
    res.paymentToken = self.createPaymentToken(source, res);
    callback(null, res);
  });
};

/**
 * Creates and sends a charge request to the Payflow Pro Gateway.
 *
 * @param source the payment source.
 * @param amount the amount to charge.
 * @param options the options to use.
 *          [transactionId] the associated transaction ID.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.charge = function(
  source, amount, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var req;
  try {
    req = self.createChargeRequest(source, amount, options);
  } catch(ex) {
    return callback(ex);
  }
  self.send(req, callback);
};

/**
 * Creates and sends a hold request to the Payflow Pro Gateway.
 *
 * @param source the payment source.
 * @param amount the amount to hold.
 * @param options the options to use.
 *          [transactionId] the associated transaction ID.
 *          [ip] the associated client's IP address.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.hold = function(
  source, amount, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var req;
  try {
    req = self.createHoldRequest(source, amount, options);
  } catch(ex) {
    return callback(ex);
  }
  self.send(req, callback);
};

/**
 * Creates and sends a capture request to the Payflow Pro Gateway.
 *
 * @param txn the original transaction to capture held funds for.
 * @param options the options to use.
 *          [amount] a lesser amount to capture than the full transaction
 *            amount.
 * @param callback(err, res) called once the operation completes.
 */
api.PayflowClient.prototype.capture = function(
  source, amount, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this;
  var req;
  try {
    req = self.createCaptureRequest(source, amount, options);
  } catch(ex) {
    return callback(ex);
  }
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
  var req;
  try {
    req = self.createCreditRequest(destination, options);
  } catch(ex) {
    return callback(ex);
  }
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
  var req;
  try {
    req = self.createInquiryRequest(txn);
  } catch(ex) {
    return callback(ex);
  }
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
  if(jsonld.hasValue(source, 'type', 'BankAccount')) {
    req.PRENOTE = 'Y';
    req.AMT = '0.00';
  } else {
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
 * @param options the options to use.
 *          [transactionId] the associated transaction ID.
 *          [ip] the associated client's IP address.
 *
 * @return the request.
 */
api.PayflowClient.prototype.createChargeRequest = function(
  source, amount, options) {
  options = options || {};
  var req = {};
  req.TRXTYPE = 'S';
  if(!jsonld.hasValue(source, 'type', 'BankAccount')) {
    req.CURRENCY = 'USD';
  }
  req.AMT = amount;
  if(options.transactionId) {
    // hash transaction ID
    var md = crypto.createHash('sha256');
    md.update(options.transactionId, 'utf8');
    req.COMMENT1 = md.digest('hex');
  }
  return _methodToRequest(source, req);
};

/**
 * Creates a hold request. This method does not perform the hold,
 * it only creates the request that can be given to send().
 *
 * @param source the source with funds to be held.
 * @param amount the amount to hold.
 * @param options the options to use.
 *          [transactionId] the associated transaction ID.
 *          [ip] the associated client's IP address.
 *
 * @return the request.
 */
api.PayflowClient.prototype.createHoldRequest = function(
  source, amount, options) {
  options = options || {};
  var req = {};
  req.TRXTYPE = 'A';
  req.CURRENCY = 'USD';
  req.AMT = amount;
  if(options.transactionId) {
    // hash transaction ID
    var md = crypto.createHash('sha256');
    md.update(options.transactionId, 'utf8');
    req.COMMENT1 = md.digest('hex');
  }
  return _methodToRequest(source, req);
};

/**
 * Creates a capture request. This method does not perform the capture,
 * it only creates the request that can be given to send().
 *
 * @param txn the original transaction to capture held funds for.
 * @param options the options to use.
 *          [amount] a lesser amount to capture than the full transaction
 *            amount.
 *
 * @return the request.
 */
api.PayflowClient.prototype.createCaptureRequest = function(txn, options) {
  options = options || {};
  var req = {};
  req.TRXTYPE = 'D';
  req.TENDER = 'C';
  req.ORIGID = txn.psaGatewayRefId || '0';
  if('amount' in options) {
    req.AMT = options.amount;
  }
  return req;
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
  if(!jsonld.hasValue(destination, 'type', 'BankAccount')) {
    req.CURRENCY = 'USD';
  }
  if('amount' in options) {
    req.AMT = options.amount;
  }
  if(options.transactionId) {
    // hash transaction ID
    var md = crypto.createHash('sha256');
    md.update(options.transactionId, 'utf8');
    req.COMMENT1 = md.digest('hex');
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
        return callback(new Error(
          'Received HTTP error status "' + res.statusCode + '"'));
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
        // RESULT < 0 indicates a communication error, no txn was attempted
        // RESULT == 0 means no errors occurred
        // RESULT > 0 means decline or error
        callback(null, {response: result});
      });
      res.on('error', callback);
    })
    .on('error', callback)
    .end(encoded);
  } catch(ex) {
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
    token['@context'] = 'https://w3id.org/payswarm/v1';
    token.type = 'PaymentToken';
    token.paymentToken = res.response.PNREF;
    if(jsonld.hasValue(source, 'type', 'CreditCard')) {
      token.paymentMethod = 'CreditCard';
      token.cardBrand = source.cardBrand;
      token.cardExpMonth = source.cardExpMonth;
      token.cardExpYear = source.cardExpYear;
      // mask
      token.cardNumber = source.cardNumber.replace(/.{1}(?=.{4})/g, '*');
    } else if(jsonld.hasValue(source, 'type', 'BankAccount')) {
      token.paymentMethod = 'BankAccount';
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
    } else {
      // simple encoding
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
      length = parseInt(name.substr(startBracket + 1, endBracket), 10);
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
    } else if(name in rval) {
      rval[name] = [rval[name], value];
    } else {
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
  if(jsonld.hasValue(method, 'type', 'PaymentToken')) {
    _paymentTokenToRequest(method, req);
  } else if(jsonld.hasValue(method, 'type', 'CreditCard')) {
    _cardToRequest(method, req);
  } else if(jsonld.hasValue(method, 'type', 'BankAccount')) {
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
  if(jsonld.hasValue(token, 'paymentMethod', 'CreditCard')) {
    req.TENDER = 'C';
  } else if(jsonld.hasValue(token, 'paymentMethod', 'BankAccount')) {
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
  // only send state information if in US (field limited to 2 digit alpha state)
  if(address.countryName === 'US') {
    req.STATE = address.region;
  }
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
  if(jsonld.hasValue(account, 'type', 'Savings')) {
    req.ACCTTYPE = 'S';
  } else {
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
// Generated from bin/country-codes.js
var countryCodes = {
  'AF': '004', // Afghanistan
  'AX': '248', // Åland Islands
  'AL': '008', // Albania
  'DZ': '012', // Algeria
  'AS': '016', // American Samoa
  'AD': '020', // Andorra
  'AO': '024', // Angola
  'AI': '660', // Anguilla
  'AQ': '010', // Antarctica
  'AG': '028', // Antigua and Barbuda
  'AR': '032', // Argentina
  'AM': '051', // Armenia
  'AW': '533', // Aruba
  'AU': '036', // Australia
  'AT': '040', // Austria
  'AZ': '031', // Azerbaijan
  'BS': '044', // Bahamas
  'BH': '048', // Bahrain
  'BD': '050', // Bangladesh
  'BB': '052', // Barbados
  'BY': '112', // Belarus
  'BE': '056', // Belgium
  'BZ': '084', // Belize
  'BJ': '204', // Benin
  'BM': '060', // Bermuda
  'BT': '064', // Bhutan
  'BO': '068', // Bolivia, Plurinational State of
  'BQ': '535', // Bonaire, Sint Eustatius and Saba
  'BA': '070', // Bosnia and Herzegovina
  'BW': '072', // Botswana
  'BV': '074', // Bouvet Island
  'BR': '076', // Brazil
  'IO': '086', // British Indian Ocean Territory
  'BN': '096', // Brunei Darussalam
  'BG': '100', // Bulgaria
  'BF': '854', // Burkina Faso
  'BI': '108', // Burundi
  'KH': '116', // Cambodia
  'CM': '120', // Cameroon
  'CA': '124', // Canada
  'CV': '132', // Cape Verde
  'KY': '136', // Cayman Islands
  'CF': '140', // Central African Republic
  'TD': '148', // Chad
  'CL': '152', // Chile
  'CN': '156', // China
  'CX': '162', // Christmas Island
  'CC': '166', // Cocos (Keeling) Islands
  'CO': '170', // Colombia
  'KM': '174', // Comoros
  'CG': '178', // Congo
  'CD': '180', // Congo, the Democratic Republic of the
  'CK': '184', // Cook Islands
  'CR': '188', // Costa Rica
  'CI': '384', // Côte d\'Ivoire
  'HR': '191', // Croatia
  'CU': '192', // Cuba
  'CW': '531', // Curaçao
  'CY': '196', // Cyprus
  'CZ': '203', // Czech Republic
  'DK': '208', // Denmark
  'DJ': '262', // Djibouti
  'DM': '212', // Dominica
  'DO': '214', // Dominican Republic
  'EC': '218', // Ecuador
  'EG': '818', // Egypt
  'SV': '222', // El Salvador
  'GQ': '226', // Equatorial Guinea
  'ER': '232', // Eritrea
  'EE': '233', // Estonia
  'ET': '231', // Ethiopia
  'FK': '238', // Falkland Islands (Malvinas)
  'FO': '234', // Faroe Islands
  'FJ': '242', // Fiji
  'FI': '246', // Finland
  'FR': '250', // France
  'GF': '254', // French Guiana
  'PF': '258', // French Polynesia
  'TF': '260', // French Southern Territories
  'GA': '266', // Gabon
  'GM': '270', // Gambia
  'GE': '268', // Georgia
  'DE': '276', // Germany
  'GH': '288', // Ghana
  'GI': '292', // Gibraltar
  'GR': '300', // Greece
  'GL': '304', // Greenland
  'GD': '308', // Grenada
  'GP': '312', // Guadeloupe
  'GU': '316', // Guam
  'GT': '320', // Guatemala
  'GG': '831', // Guernsey
  'GN': '324', // Guinea
  'GW': '624', // Guinea-Bissau
  'GY': '328', // Guyana
  'HT': '332', // Haiti
  'HM': '334', // Heard Island and McDonald Islands
  'VA': '336', // Holy See (Vatican City State)
  'HN': '340', // Honduras
  'HK': '344', // Hong Kong
  'HU': '348', // Hungary
  'IS': '352', // Iceland
  'IN': '356', // India
  'ID': '360', // Indonesia
  'IR': '364', // Iran, Islamic Republic of
  'IQ': '368', // Iraq
  'IE': '372', // Ireland
  'IM': '833', // Isle of Man
  'IL': '376', // Israel
  'IT': '380', // Italy
  'JM': '388', // Jamaica
  'JP': '392', // Japan
  'JE': '832', // Jersey
  'JO': '400', // Jordan
  'KZ': '398', // Kazakhstan
  'KE': '404', // Kenya
  'KI': '296', // Kiribati
  'KP': '408', // Korea, Democratic People\'s Republic of
  'KR': '410', // Korea, Republic of
  'KW': '414', // Kuwait
  'KG': '417', // Kyrgyzstan
  'LA': '418', // Lao People\'s Democratic Republic
  'LV': '428', // Latvia
  'LB': '422', // Lebanon
  'LS': '426', // Lesotho
  'LR': '430', // Liberia
  'LY': '434', // Libya
  'LI': '438', // Liechtenstein
  'LT': '440', // Lithuania
  'LU': '442', // Luxembourg
  'MO': '446', // Macao
  'MK': '807', // Macedonia, The Former Yugoslav Republic of
  'MG': '450', // Madagascar
  'MW': '454', // Malawi
  'MY': '458', // Malaysia
  'MV': '462', // Maldives
  'ML': '466', // Mali
  'MT': '470', // Malta
  'MH': '584', // Marshall Islands
  'MQ': '474', // Martinique
  'MR': '478', // Mauritania
  'MU': '480', // Mauritius
  'YT': '175', // Mayotte
  'MX': '484', // Mexico
  'FM': '583', // Micronesia, Federated States of
  'MD': '498', // Moldova, Republic of
  'MC': '492', // Monaco
  'MN': '496', // Mongolia
  'ME': '499', // Montenegro
  'MS': '500', // Montserrat
  'MA': '504', // Morocco
  'MZ': '508', // Mozambique
  'MM': '104', // Myanmar
  'NA': '516', // Namibia
  'NR': '520', // Nauru
  'NP': '524', // Nepal
  'NL': '528', // Netherlands
  'NC': '540', // New Caledonia
  'NZ': '554', // New Zealand
  'NI': '558', // Nicaragua
  'NE': '562', // Niger
  'NG': '566', // Nigeria
  'NU': '570', // Niue
  'NF': '574', // Norfolk Island
  'MP': '580', // Northern Mariana Islands
  'NO': '578', // Norway
  'OM': '512', // Oman
  'PK': '586', // Pakistan
  'PW': '585', // Palau
  'PS': '275', // Palestine, State of
  'PA': '591', // Panama
  'PG': '598', // Papua New Guinea
  'PY': '600', // Paraguay
  'PE': '604', // Peru
  'PH': '608', // Philippines
  'PN': '612', // Pitcairn
  'PL': '616', // Poland
  'PT': '620', // Portugal
  'PR': '630', // Puerto Rico
  'QA': '634', // Qatar
  'RE': '638', // Réunion
  'RO': '642', // Romania
  'RU': '643', // Russian Federation
  'RW': '646', // Rwanda
  'BL': '652', // Saint Barthélemy
  'SH': '654', // Saint Helena, Ascension and Tristan da Cunha
  'KN': '659', // Saint Kitts and Nevis
  'LC': '662', // Saint Lucia
  'MF': '663', // Saint Martin (French part)
  'PM': '666', // Saint Pierre and Miquelon
  'VC': '670', // Saint Vincent and the Grenadines
  'WS': '882', // Samoa
  'SM': '674', // San Marino
  'ST': '678', // Sao Tome and Principe
  'SA': '682', // Saudi Arabia
  'SN': '686', // Senegal
  'RS': '688', // Serbia
  'SC': '690', // Seychelles
  'SL': '694', // Sierra Leone
  'SG': '702', // Singapore
  'SX': '534', // Sint Maarten (Dutch part)
  'SK': '703', // Slovakia
  'SI': '705', // Slovenia
  'SB': '090', // Solomon Islands
  'SO': '706', // Somalia
  'ZA': '710', // South Africa
  'GS': '239', // South Georgia and the South Sandwich Islands
  'SS': '728', // South Sudan
  'ES': '724', // Spain
  'LK': '144', // Sri Lanka
  'SD': '729', // Sudan
  'SR': '740', // Suriname
  'SJ': '744', // Svalbard and Jan Mayen
  'SZ': '748', // Swaziland
  'SE': '752', // Sweden
  'CH': '756', // Switzerland
  'SY': '760', // Syrian Arab Republic
  'TW': '158', // Taiwan, Province of China
  'TJ': '762', // Tajikistan
  'TZ': '834', // Tanzania, United Republic of
  'TH': '764', // Thailand
  'TL': '626', // Timor-Leste
  'TG': '768', // Togo
  'TK': '772', // Tokelau
  'TO': '776', // Tonga
  'TT': '780', // Trinidad and Tobago
  'TN': '788', // Tunisia
  'TR': '792', // Turkey
  'TM': '795', // Turkmenistan
  'TC': '796', // Turks and Caicos Islands
  'TV': '798', // Tuvalu
  'UG': '800', // Uganda
  'UA': '804', // Ukraine
  'AE': '784', // United Arab Emirates
  'GB': '826', // United Kingdom
  'US': '840', // United States
  'UM': '581', // United States Minor Outlying Islands
  'UY': '858', // Uruguay
  'UZ': '860', // Uzbekistan
  'VU': '548', // Vanuatu
  'VE': '862', // Venezuela, Bolivarian Republic of
  'VN': '704', // Viet Nam
  'VG': '092', // Virgin Islands, British
  'VI': '850', // Virgin Islands, U.S.
  'WF': '876', // Wallis and Futuna
  'EH': '732', // Western Sahara
  'YE': '887', // Yemen
  'ZM': '894', // Zambia
  'ZW': '716' // Zimbabwe
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
    var err = new Error('Payments from the country "' + country + '" are not ' +
      'currently supported.');
    err.name = 'UnsupportedCountry';
    throw err;
  }
  return code;
}
