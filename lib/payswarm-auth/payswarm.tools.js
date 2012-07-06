/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var util = require('util');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../payswarm.config'),
  money: require('./payswarm.money')
};
var Money = payswarm.money.Money;

var api = {};
module.exports = api;

// PaySwarm JSON-LD contexts
api.PAYSWARM_CONTEXT_V1 = 'http://purl.org/payswarm/v1';
// Current PaySwarm context
api.PAYSWARM_CONTEXT = api.PAYSWARM_CONTEXT_V1;

// payee constants
var PAYEE = api.PAYEE = {};
PAYEE.RATE_TYPE = {
  /** A flat amount. */
  FLAT: 'com:FlatAmount',
  /** A percentage. */
  PERCENTAGE: 'com:Percentage'
};
PAYEE.RATE_CONTEXT = {
  /** Like typical sales tax, total the payment and then add a percentage of it
  to the total increasing it (<com:Deferred> by default). */
  EXCLUSIVE: 'com:Exclusive',
  /** Like typical income tax, add a percentage of the total, decreasing the
  other payees by that percentage effectively leaving the total the same. */
  INCLUSIVE: 'com:Inclusive',
  /** Include all preceeding, including non-flat rates, when apply the
  percentage rate (normally only flat-rate payees apply). */
  CUMULATIVE: 'com:Cumulative',
  /** Wait to calculate the transfer amount for this payee until all other
  non-deferred payees had been handled. */
  DEFERRED: 'com:Deferred',
  /** Consider the amount for this payee tax-exempt. */
  TAX_EXEMPT: 'com:TaxExempt',
  /** Consider the amount for this payee a tax. */
  TAX: 'com:Tax'
};

// PaySwarmError class
api.PaySwarmError = function(message, type, details, cause) {
  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.name = type;
  this.message = message;
  this.details = details || null;
  this.cause = cause || null;
};
util.inherits(api.PaySwarmError, Error);
api.PaySwarmError.prototype.name = 'PaySwarmError';
api.PaySwarmError.prototype.toObject = function() {
  var rval = {
    message: this.message,
    type: this.name,
    details: this.details,
    cause: null
  };
  if(payswarm.config.environment === 'development') {
    rval.stack = this.stack;
  }
  if(this.cause) {
    if(this.cause instanceof api.PaySwarmError) {
      rval.cause = this.cause.toObject();
    }
    else {
      rval.cause = {
        message: this.cause.message,
        type: this.cause.name,
        details: {
          inspect: util.inspect(this.cause, false, 10)
        }
      };
      if(payswarm.config.environment === 'development') {
        rval.cause.stack = this.cause.stack;
      }
    }
  }
  return rval;
};

/**
 * Gets the passed date in W3C format (eg: 2011-03-09T21:55:41Z).
 *
 * @param date the date.
 *
 * @return the date in W3C format.
 */
api.w3cDate = function(date) {
  if(date === undefined || date === null) {
    date = new Date();
  }
  return util.format('%d-%s-%sT%s:%s:%sZ',
    date.getUTCFullYear(),
    _zeroFill2(date.getUTCMonth() + 1),
    _zeroFill2(date.getUTCDate()),
    _zeroFill2(date.getUTCHours()),
    _zeroFill2(date.getUTCMinutes()),
    _zeroFill2(date.getUTCSeconds()));
};

function _zeroFill2(num) {
  return (num < 10) ? '0' + num : '' + num;
}

/**
 * Gets the default PaySwarm JSON-LD context.
 *
 * @return the default PaySwarm JSON-LD context.
 */
api.getDefaultJsonLdContext = function() {
  var ctx = {
    // aliases
    'id': '@id',
    'type': '@type',

    // prefixes
    'ccard': 'http://purl.org/commerce/creditcard#',
    'com': 'http://purl.org/commerce#',
    'dc': 'http://purl.org/dc/terms/',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'gr': 'http://purl.org/goodrelations/v1#',
    'ps': 'http://purl.org/payswarm#',
    // FIXME need psa url
    // 'psa': '...',
    'psp': 'http://purl.org/payswarm/preferences#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'sec': 'http://purl.org/security#',
    'vcard': 'http://www.w3.org/2006/vcard/ns#',
    'xsd': 'http://www.w3.org/2001/XMLSchema#',

    // general
    'address': {'@id': 'vcard:adr', '@type': '@id'},
    'comment': 'rdfs:comment',
    'countryName': 'vcard:country-name',
    'created': {'@id': 'dc:created', '@type': 'xsd:dateTime'},
    'creator': {'@id': 'dc:creator', '@type': '@id'},
    'depiction': {'@id': 'foaf:depiction', '@type': '@id'},
    'description': 'dc:description',
    'email': 'foaf:mbox',
    'fullName': 'vcard:fn',
    'homepage': {'@id': 'foaf:homepage', '@type': '@id'},
    'label': 'rdfs:label',
    'locality': 'vcard:locality',
    'postalCode': 'vcard:postal-code',
    'region': 'vcard:region',
    'streetAddress': 'vcard:street-address',
    'title': 'dc:title',

    // bank
    'bankAccount': 'bank:account',
    'bankRouting': 'bank:routing',

    // credit card
    'cardAddress': {'@id': 'ccard:address', '@type': '@id'},
    'cardBrand': {'@id': 'ccard:brand', '@type': '@id'},
    'cardCvm': 'ccard:cvm',
    // FIXME: use xsd mo/yr types?
    'cardExpMonth': 'ccard:expMonth',
    'cardExpYear': 'ccard:expYear',
    'cardNumber': 'ccard:number',

    // commerce
    'account': {'@id': 'com:account', '@type': '@id'},
    'accountOwnerType': {'@id': 'com:accountOwnerType', '@type': '@id'},
    'amount': 'com:amount',
    'balance': 'com:balance',
    'currency': 'com:currency',
    'destination': {'@id': 'com:destination', '@type': '@id'},
    'escrow': 'com:escrow',
    'forTransaction': {'@id': 'com:forTransaction', '@type': '@id'},
    'maximumAmount': 'com:maximumAmount',
    'maximumPayeeRate': 'com:maximumPayeeRate',
    'minimumAmount': 'com:minimumAmount',
    'payee': {'@id': 'com:payee', '@type': '@id', '@container': '@set'},
    'payeeRule': {'@id': 'com:payeeRule', '@type': '@id', '@container': '@set'},
    'payeeLimitation': {'@id': 'com:payeeLimitation', '@type': '@id'},
    // FIXME: be more strict with nonNegativeInteger?
    'payeePosition': {'@id': 'com:payeePosition', '@type': 'xsd:integer'},
    'payeeRate': 'com:payeeRate',
    'payeeRateContext': {'@id': 'com:payeeRateContext', '@type': '@id'},
    'payeeRateType': {'@id': 'com:payeeRateType', '@type': '@id'},
    'paymentGateway': 'com:paymentGateway',
    'paymentMethod': {'@id': 'com:paymentMethod', '@type': '@id'},
    'paymentToken': 'com:paymentToken',
    'referenceId': 'com:referenceId',
    'settled': {'@id': 'com:settled', '@type': 'xsd:dateTime'},
    'source': {'@id': 'com:source', '@type': '@id'},
    'transfer': {'@id': 'com:transfer', '@type': '@id'},
    'vendor': {'@id': 'com:vendor', '@type': '@id'},
    'voided': {'@id': 'com:voided', '@type': 'xsd:dateTime'},

    // error
    // FIXME
    // 'errorMessage': 'err:message'

    // payswarm
    'asset': {'@id': 'ps:asset', '@type': '@id'},
    'assetAcquirer': {'@id': 'ps:assetAcquirer', '@type': '@id'},
    // FIXME: support inline content
    'assetContent': {'@id': 'ps:assetContent', '@type': '@id'},
    'assetHash': 'ps:assetHash',
    'assetProvider': {'@id': 'ps:assetProvider', '@type': '@id'},
    'authority': {'@id': 'ps:authority', '@type': '@id'},
    'identityHash': 'ps:identityHash',
    // FIXME: move?
    'ipv4Address': 'ps:ipv4Address',
    'license': {'@id': 'ps:license', '@type': '@id'},
    'licenseHash': 'ps:licenseHash',
    'licenseTemplate': 'ps:licenseTemplate',
    'licenseTerms': {'@id': 'ps:licenseTerms', '@type': '@id'},
    'listing': {'@id': 'ps:listing', '@type': '@id'},
    'listingHash': 'ps:listingHash',
    // FIXME: move?
    'owner': {'@id': 'ps:owner', '@type': '@id'},
    'preferences': {'@id': 'ps:preferences', '@type': '@id'},
    'validFrom': {'@id': 'ps:validFrom', '@type': 'xsd:dateTime'},
    'validUntil': {'@id': 'ps:validUntil', '@type': 'xsd:dateTime'},

    // security
    'cipherAlgorithm': 'sec:cipherAlgorithm',
    'cipherData': 'sec:cipherData',
    'cipherKey': 'sec:cipherKey',
    'digestAlgorithm': 'sec:digestAlgorithm',
    'digestValue': 'sec:digestValue',
    'expiration': {'@id': 'sec:expiration', '@type': 'xsd:dateTime'},
    'initializationVector': 'sec:initializationVector',
    'nonce': 'sec:nonce',
    'normalizationAlgorithm': 'sec:normalizationAlgorithm',
    'password': 'sec:password',
    'privateKey': {'@id': 'sec:privateKey', '@type': '@id'},
    'privateKeyPem': 'sec:privateKeyPem',
    'publicKey': {'@id': 'sec:publicKey', '@type': '@id'},
    'publicKeyPem': 'sec:publicKeyPem',
    'publicKeyService': {'@id': 'sec:publicKeyService', '@type': '@id'},
    'revoked': {'@id': 'sec:revoked', '@type': '@id'},
    'signature': 'sec:signature',
    'signatureAlgorithm': 'sec:signatureAlgorithm',
    'signatureValue': 'sec:signatureValue'
  };

  // payswarm authority
  // FIXME
  // 'psaModule': {'@id': 'psa:module', '@type': '@id'},
  // 'psaRole': {'@id': 'psa:role', '@type': '@id'},
  // 'psaSlug': 'psa:slug',
  // 'psaIdentifier': 'psa:identifier',
  // 'psaPassword': 'psa:password',
  // 'psaPasscode': 'psa:passcode',
  // 'psaMaxPerUse': 'psa:maxPerUse',
  // 'psaRefresh': 'psa:refresh',
  // 'psaExpires': 'psa:expires',
  // 'psaStatus': 'psa:status',
  // 'psaPrivacy': 'psa:privacy',
  // 'psaHashedPassword': 'psa:hashedPassword',
  // 'psaHashedPasscode': 'psa:hashedPasscode',
  // 'psaValidated': 'psa:validated',
  // 'psaAddressHash': 'psa:addressHash',

  return ctx;
};

/**
 * Gets the default PaySwarm JSON-LD frames.
 *
 * @return the default PaySwarm JSON-LD frames.
 */
api.getDefaultJsonLdFrames = function() {
  // FIXME: use shared frames
  var frames = {};
  var ctx = api.getDefaultJsonLdContext();

  // Note: The frames for Asset and Listing should not be used to check
  // hashes because they will strip embedded information that might be
  // included in the hash -- resulting in a hash mismatch.

  frames['ps:Asset'] = {
    '@context': api.clone(ctx),
    type: 'ps:Asset',
    creator: {},
    signature: {'@embed': true},
    assetProvider: {'@embed': false}
  };

  frames['ps:License'] = {
    '@context': api.clone(ctx),
    type: 'ps:License'
  };

  frames['ps:Listing'] = {
    '@context': api.clone(ctx),
    type: 'ps:Listing',
    asset: {'@embed': false},
    license: {'@embed': false},
    signature: {'@embed': true}
  };

  // pseudo type used for a frame name
  frames['ps:Contract/Short'] = {
    '@context': api.clone(ctx),
    type: 'ps:Contract',
    '@explicit': true,
    asset: {'@embed': false},
    license: {'@embed': false},
    listing: {'@embed': false},
    assetProvider: {'@embed': false},
    assetAcquirer: {'@embed': false}
     // TODO: add any other necessary short-form information
  };

  return frames;
};

/**
 * Merges the contents of one or more objects into the first object.
 *
 * @param deep (optional), true to do a deep-merge.
 * @param target the target object to merge properties into.
 * @param objects N objects to merge into the target.
 *
 * @return the default PaySwarm JSON-LD context.
 */
api.extend = function() {
  var target;
  var deep = false;
  if(arguments.length > 0) {
    if(typeof arguments[0] === 'boolean') {
      deep = arguments[0];
    }
    else {
      target = arguments[0];
    }
  }
  target = target || {};
  for(var i = 1; i < arguments.length; ++i) {
    var obj = arguments[i] || {};
    Object.keys(obj).forEach(function(name) {
      var value = obj[name];
      if(deep && api.isObject(value) && !Array.isArray(value)) {
        target[name] = api.extend(true, target[name], value);
      }
      else {
        target[name] = value;
      }
    });
  }
  return target;
};

/**
 * Returns true if the given value is an Object.
 *
 * @param value the value to check.
 *
 * @return true if it is an Object, false if not.
 */
api.isObject = function(value) {
  return (Object.prototype.toString.call(value) === '[object Object]');
};

/**
 * Clones a value. If the value is an array or an object it will be deep cloned.
 *
 * @param value the value to clone.
 *
 * @return the clone.
 */
api.clone = function(value) {
  var rval;
  if(Array.isArray(value)) {
    rval = [];
    value.forEach(function(e) {
      rval.push(api.clone(e));
    });
  }
  else if(api.isObject(value)) {
    rval = {};
    Object.keys(value).forEach(function(name) {
      rval[name] = api.clone(value[name]);
    });
  }
  else {
    rval = value;
  }
  return rval;
};

/**
 * Generates a new v4 UUID.
 *
 * @return the new v4 UUID.
 */
api.uuid = function() {
  // taken from: https://gist.github.com/1308368
  return (function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;})();
};

/**
 * Blinds sensitive information in a CreditCard.
 *
 * @param card the CreditCard to blind.
 *
 * @return the blinded CreditCard.
 */
api.blindCreditCard = function(card) {
  card = api.clone(card);

  // show last 4 digits or as many as are available, fill rest with '*'
  var masked = card.cardNumber.replace(/.{1}(?=.{4})/g, '*');
  card.cardNumber = masked;
  card.cardCvm = '***';
  // FIXME: can we leave expiration unmasked for all cards?
  // Don't mask for Discover Card
  // re: TransFirst Merchant Card Processing Operation Guide v2.209
  //     5(j)(2), 5(o)(e)
  // FIXME: Does this exception apply to other processors?
  /*if(card.cardBrand != 'ccard:Discover') {
    card.cardExpMonth = '**';
    card.cardExpYear = '**';
  }*/

  return card;
};

/**
 * Orders Payees according to their payeePosition. If a payee does not have
 * a payeePosition, it will be given one that is higher than the highest
 * given position.
 *
 * @param payees the Payees to order.
 *
 * @return the ordered Payees.
 */
// FIXME: remove if payees changed to use lists
api.sortPayees = function(payees) {
  if(!payees) {
    return [];
  }

  // sanitize payees
  payees = Array.isArray(payees) ? payees : [payees];

  // get highest position
  var max = -1;
  for(var i in payees) {
    var payee = payees[i];
    var position = payee.payeePosition || 0;
    if(position > max) {
      position = max;
    }
  }
  // assign positions to unassigned payees
  for(var i in payees) {
    var payee = payees[i];
    if(!('payeePosition' in payee)) {
      payee.payeePosition = ++max;
    }
  }

  // sort payees
  payees.sort(function(a, b) {
    var p1 = a.payeePosition;
    var p2 = b.payeePosition;
    return p1 < p2 ? -1 : (p1 > p2 ? 1 : 0);
  });
  return payees;
};

/**
 * Appends a Payee to the given list of Payees.
 *
 * @param payees the list of Payees to append to.
 * @param payee the Payee to append.
 */
api.appendPayee = function(payees, payee) {
  if(payees.length === 0) {
    payee.payeePosition = 0;
  }
  else {
    var last = payees[payees.length - 1];
    payee.payeePosition = last.payeePosition + 1;
  }
  payees.push(payee);
};

/**
 * Appends one list of Payees onto the end of another.
 *
 * @param p1 the list of Payees to append to.
 * @param p2 the list of Payee to append.
 */
api.appendPayees = function(p1, p2) {
  p1 = api.sortPayees(p1);
  p2 = api.sortPayees(p2);
  for(var i in p2) {
    api.appendPayee(p1, p2[i]);
  }
};

/**
 * Checks to see if a PayeeRule applies to the given Payee, permitting it
 * to be added to a Transaction.
 *
 * @param rule the PayeeRule to check.
 * @param payee the Payee to check.
 * @param ownerType the owner type for the Payee destination account (eg:
 *          'ps:PersonalIdentity', 'ps:VendorIdentity', or 'ps:Authority).
 *
 * @return true if the PayeeRule applies, false if not.
 */
api.checkPayeeRule = function(rule, payee, ownerType) {
  // check rate type
  if('payeeRateType' in rule) {
    // payee rate type must be present in rule
    if(!jsonld.hasValue(rule, 'payeeRateType', payee.payeeRateType)) {
      return false;
    }
  }

  // check rate context
  if('payeeRateContext' in rule) {
    // if rate context restricts to inclusive and payee is exclusive, fail
    // the rule
    var ruleInclusive = _hasRateContext(rule, PAYEE.RATE_CONTEXT.INCLUSIVE);
    var ruleExclusive = _hasRateContext(rule, PAYEE.RATE_CONTEXT.EXCLUSIVE);
    if(ruleInclusive && !ruleExclusive && _isPayeePercentExclusive(payee)) {
      return false;
    }

    // check other rate contexts
    var rateContexts = jsonld.getValues(payee, 'payeeRateContext');
    for(var i in rateContexts) {
      if(!_hasRateContext(rule, rateContexts[i])) {
        return false;
      }
    }
  }

  // check owner type
  if('accountOwnerType' in rule) {
    if(!jsonld.hasValue(rule, 'accountOwnerType', ownerType)) {
      return false;
    }
  }

  // check maximum rate
  if('maximumPayeeRate' in rule) {
    var rate = new Money(payee.payeeRate);
    var max = new Money(rule.maximumPayeeRate);
    if(rate.compareTo(max) > 0) {
      return false;
    }
  }

  return true;
};

/**
 * Creates Transfers for the given Transaction based on the given list
 * of Payees. The list of Transfers and the total Transaction amount
 * will be set on the Transaction.
 *
 * @param transaction the Transaction to create Transfers for.
 * @param sourceId the ID of the source FinancialAccount.
 * @param payees the list of Payees to process.
 */
api.createTransfers = function(transaction, sourceId, payees) {
  /* Algorithm:

    Break payees into 5 ordered groups:
    1. FlatAmount Payees ("flat").
    2. Non-Deferred Exclusive Percentage Payees ("ndep").
    3. Non-Deferred Inclusive Percentage Payees ("ndip").
    4. Deferred Exclusive Percentage Payees ("dep").
    5. Deferred Inclusive Percentage Payees ("dip").

    For each group, for each payee, resolve the flat monetary transfer amount
    and store it along with the payee as "amount". Update totals. Add the
    payee to a list of "working" payees.

    Note: There are 3 monetary amount resolution processes, one for each
    type of rate+context combo:
    FlatAmount, Exclusive Percentage, Inclusive Percentage. */

  // clone list of payees to allow it to be manipulated
  var pl = api.clone(payees);

  // create empty groups
  var flat = [];
  var ndep = [];
  var ndip = [];
  var dep = [];
  var dip = [];

  // create vars to store totals and working payees
  var totals = {
    initial: new Money(),
    cumulative: new Money(),
    taxable: new Money()
  };
  var working = [];

  // break up payees into groups
  for(var i in pl) {
    var p = pl[i];

    // initialize amount
    p.amount = new Money();

    if(_isPayeeFlat(p)) {
      flat.push(p);
    }
    else if(_isPayeePercentExclusive(p)) {
      if(_isPayeeDeferred(p)) {
        dep.push(p);
      }
      else {
        ndep.push(p);
      }
    }
    else if(_isPayeePercentInclusive(p)) {
      if(_isPayeeDeferred(p)) {
        dip.push(p);
      }
      else {
        ndip.push(p);
      }
    }
  }

  // handle flat payees
  for(var i in flat) {
    // rate is flat, set the amount to the rate
    var p = flat[i];
    p.amount = new Money(p.payeeRate);
    totals.initial = totals.initial.add(p.amount);
    if(!_isPayeeTaxExempt(p)) {
      totals.taxable = totals.taxable.add(p.amount);
    }
    working.push(p);
  }

  // set initial cumulative total
  totals.cumulative = totals.initial;

  // handle non-deferred exclusive percentage payees
  for(var i in ndep) {
    var p = ndep[i];
    _resolvePercentExclusive(p, totals);
    working.push(p);
  }

  // handle non-deferred inclusive percentage payees
  for(var i in ndip) {
    var p = ndip[i];
    _resolvePercentInclusive(p, working, totals);
    working.push(p);
  }

  // reset initial total to include non-deferred payees (set it to cumulative)
  totals.initial = totals.cumulative;

  // handle deferred exclusive percentage payees
  for(var i in dep) {
    var p = dep[i];
    _resolvePercentExclusive(p, totals);
    working.push(p);
  }

  // handle deferred inclusive percentage payees
  for(var i in dip) {
    var p = dip[i];
    _resolvePercentInclusive(p, working, totals);
    working.push(p);
  }

  /* Now all payee transfer amounts have been calculated. */
  transaction.amount = totals.cumulative.toString();

  // create the transfer list
  var transfers = transaction.transfer = [];
  for(var i in pl) {
    var p = pl[i];
    transfers.push({
      type: 'com:Transfer',
      forTransaction: transaction.id,
      source: sourceId,
      destination: p.destination,
      amount: p.amount.toString(),
      comment: p.comment || ''
    });
  }
};

function _hasRateContext(p, context) {
  return jsonld.hasValue(p, 'payeeRateContext', context);
}

function _isPayeeFlat(p) {
  // TODO: exclusive/inclusive flat payees not supported yet, assume
  // flat amount payees are exclusive
  return p.payeeRateType === PAYEE.RATE_TYPE.FLAT;
}

function _isPayeePercentExclusive(p) {
  // percentage payees are exclusive by default, if exclusive appears or
  // inclusive doesn't appear then the payee is exclusive
  return (
    p.payeeRateType === PAYEE.RATE_TYPE.PERCENTAGE &&
    (_hasRateContext(p, PAYEE.RATE_CONTEXT.EXCLUSIVE) ||
    !_hasRateContext(p, PAYEE.RATE_CONTEXT.INCLUSIVE)));
}

function _isPayeePercentInclusive(p) {
  // a payee is only inclusive if inclusive appears and exclusive doesn't
  return (
    p.payeeRateType === PAYEE.RATE_TYPE.PERCENTAGE &&
    _hasRateContext(p, PAYEE.RATE_CONTEXT.INCLUSIVE) &&
    !_hasRateContext(p, PAYEE.RATE_CONTEXT.EXCLUSIVE));
}

function _isPayeeTax(p) {
  return _hasRateContext(p, PAYEE.RATE_CONTEXT.TAX);
}

function _isPayeeTaxExempt(p) {
  // tax payees are tax-exempt (prevents double-taxation)
  return _isPayeeTax(p) || _hasRateContext(p, PAYEE.RATE_CONTEXT.TAX_EXEMPT);
}

function _isPayeeDeferred(p) {
  // set default deferred flag (flag is a cached value for processing)
  if(!('deferred' in p)) {
    // deferred is explictly set
    if(_hasRateContext(p, PAYEE.RATE_CONTEXT.DEFERRED)) {
      p.deferred = true;
    }
    else {
      // tax payees and exclusive payees are deferred by default
      if(_isPayeeTax(p) || _isPayeePercentExclusive(p)) {
        p.deferred = true;
      }
      // other payees are NOT deferred by default
      else {
        p.deferred = false;
      }
    }
  }
  return p.deferred;
}

function _isPayeeCumulative(p) {
  return _hasRateContext(p, PAYEE.RATE_CONTEXT.CUMULATIVE);
}

function _resolvePercentExclusive(p, totals) {
  var tmp = new Money(p.payeeRate);
  tmp = tmp.divide(100);

  // multiply rate appropriately
  var multiplier;
  if(_isPayeeTax(p)) {
    multiplier = totals.taxable;
  }
  else if(_isPayeeCumulative(p)) {
    multiplier = totals.cumulative;
  }
  else {
    multiplier = totals.initial;
  }
  tmp = tmp.multiply(multiplier);

  // apply minimum amount
  if('minimumAmount' in p) {
    var min = new Money(p.minimumAmount);
    if(tmp.compareTo(min) < 0) {
      tmp = min;
    }
  }

  // apply maximum amount
  if('maximumAmount' in p) {
    var max = new Money(p.maximumAmount);
    if(tmp.compareTo(max) > 0) {
      tmp = max;
    }
  }

  // set resolved amount
  p.amount = tmp;

  // update cumulative total
  totals.cumulative = totals.cumulative.add(tmp);

  // update taxable total
  if(!_isPayeeTaxExempt(p)) {
    totals.taxable = totals.taxable.add(tmp);
  }
}

function _resolvePercentInclusive(p, working, totals) {
  var total = new Money();

  // iterate over each resolved payee applying the inclusive rate by
  // adding it to a total and decrementing it from the payee's amount
  var isTax = _isPayeeTax(p);
  for(var i in working) {
    var next = working[i];

    // if inclusive payee is a tax and "next" is tax exempt then it doesn't
    // need to be updated, otherwise it does
    if(!(isTax && _isPayeeTaxExempt(next))) {
      // FIXME: ensure rate is not greater than 100% (illegal for inclusive)

      // get percentage to subtract from payee
      var tmp = next.amount;
      tmp = tmp.multiply(new Money(p.payeeRate));
      tmp = tmp.divide(100);

      // FIXME: should/can minimum/maximum amounts be applied?

      // update totals by percentage change
      total = total.add(tmp);
      if(!_isPayeeTaxExempt(next)) {
        totals.taxable = totals.taxable.subtract(tmp);
      }

      // update current payee (subtraction is reversed as minor optimization)
      tmp = tmp.subtract(next.amount);
      next.amount = tmp.abs();
    }
  }

  // set resolved amount
  p.amount = total;

  // update taxable total
  if(!_isPayeeTaxExempt(p)) {
    totals.taxable = totals.taxable.add(total);
  }
}
