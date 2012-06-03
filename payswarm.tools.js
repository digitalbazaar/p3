/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var util = require('util');
var jsonld = require('./jsonld');
var payswarm = {
  config: require('./payswarm.config'),
  logger: require('./payswarm.logger'),
  money: require('./payswarm.money')
};
var Money = payswarm.money.Money;

var api = {};
module.exports = api;

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
        details: null
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
    'ccard': 'http://purl.org/commerce/creditcard#',
    'com': 'http://purl.org/commerce#',
    'dc': 'http://purl.org/dc/terms/',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'gr': 'http://purl.org/goodrelations/v1#',
    'ps': 'http://purl.org/payswarm#',
    // 'psa': '...',
    'psp': 'http://purl.org/payswarm/preferences#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'sec': 'http://purl.org/security#',
    'vcard': 'http://www.w3.org/2006/vcard/ns#',
    'xsd': 'http://www.w3.org/2001/XMLSchema#',

    // type coercion
    'ccard:brand': {'@type': '@id'},
    'com:destination': {'@type': '@id'},
    'com:destinationOwnerType': {'@type': '@id'},
    'com:payee': {'@type': '@id'},
    'com:rateContext': {'@type': '@id'},
    'com:rateType': {'@type': '@id'},
    'com:source': {'@type': '@id'},
    'dc:creator': {'@type': '@id'},
    'ps:asset': {'@type': '@id'},
    'ps:assetAcquirer': {'@type': '@id'},
    'ps:assetProvider': {'@type': '@id'},
    'ps:authority': {'@type': '@id'},
    'ps:contentUrl': {'@type': '@id'},
    'ps:license': {'@type': '@id'},
    'ps:listing': {'@type': '@id'},
    // 'psa:module': {'@type': '@id'},
    // 'psa:role': {'@type': '@id'},
    'sec:publicKey': {'@type': '@id'},
    'sec:signer': {'@type': '@id'},
    // FIXME: be more strict with nonNegativeInteger?
    'com:payeePosition': {'@type': 'xsd:integer'},
    'dc:created': {'@type': 'xsd:dateTime'},
    'com:date': {'@type': 'xsd:dateTime'},
    'ps:validFrom': {'@type': 'xsd:dateTime'},
    'ps:validUntil': {'@type': 'xsd:dateTime'},
    'ps:licenseTemplate': {'@type': 'rdf:XMLLiteral'}
  };
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
    '@type': 'ps:Asset',
    'dc:creator': {},
    'sec:signature': {'@embed': true},
    'ps:assetProvider': {'@embed': false}
  };

  frames['ps:License'] = {
    '@context': api.clone(ctx),
    '@type': 'ps:License'
  };

  frames['ps:Listing'] = {
    '@context': api.clone(ctx),
    '@type': 'ps:Listing',
    'ps:asset': {'@embed': false},
    'ps:license' : {'@embed': false},
    'sec:signature': {'@embed': true}
  };

  // pseudo type used for a frame name
  frames['ps:Contract/Short'] = {
    '@context': api.clone(ctx),
    '@type': 'ps:Contract',
    '@explicit': true,
    'ps:asset': {'@embed': false},
    'ps:license': {'@embed': false},
    'ps:listing': {'@embed': false},
    'ps:assetProvider': {'@embed': false},
    'ps:assetAcquirer': {'@embed': false}
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
  var i = 1;
  if(arguments.length > 0) {
    if(typeof arguments[0] === 'boolean') {
      deep = arguments[0];
      ++i;
    }
    else {
      target = arguments[0];
    }
  }
  target = target || {};
  for(; i < arguments.length; ++i) {
    var obj = arguments[i] || {};
    Object.keys(obj).forEach(function(name) {
      var value = obj[name];
      if(deep && typeof value === 'object' && !(value instanceof Array)) {
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
  else if(typeof value === 'object') {
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
 * Blinds sensitive information in a CreditCard.
 *
 * @param card the CreditCard to blind.
 *
 * @return the blinded CreditCard.
 */
api.blindCreditCard = function(card) {
  card = api.clone(card);

  // show last 4 digits or as many as are available, fill rest with '*'
  var masked = card['ccard:number'].replace(/.{1}(?=.{4})/g, '*');
  card["ccard:number"] = masked;
  card["ccard:cvm"] = "***";
  // FIXME: can we leave expiration unmasked for all cards?
  // Don't mask for Discover Card
  // re: TransFirst Merchant Card Processing Operation Guide v2.209
  //     5(j)(2), 5(o)(e)
  // FIXME: Does this exception apply to other processors?
  /*if(card["ccard:brand"] != "ccard:Discover") {
    card["ccard:expMonth"] = "**";
    card["ccard:expYear"] = "**";
  }*/

  return card;
};

/**
 * Orders Payees according to their payeePosition.
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
  payees = Array.isArray(payees) ? payees : [payees];
  payees.sort(function(a, b) {
    var p1 = a['com:payeePosition'];
    var p2 = b['com:payeePosition'];
    return p1 < p2 ? -1 : (p1 > p2 ? 1 : 0);
  });
};

/**
 * Appends a Payee to the given list of Payees.
 *
 * @param payees the list of Payees to append to.
 * @param payee the Payee to append.
 */
api.appendPayee = function(payees, payee) {
  var last = payees[payees.length - 1];
  payee['com:payeePosition'] = last['com:payeePosition'] + 1;
  payees.push(payees);
};

/**
 * Appends one list of Payees onto the end of another.
 *
 * @param p1 the list of Payees to append to.
 * @param p2 the list of Payee to append.
 */
api.appendPayees = function(p1, p2) {
  api.sortPayees(p1);
  api.sortPayees(p2);
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
 *          'identity' or 'authority).
 *
 * @return true if the PayeeRule applies, false if not.
 */
api.checkPayeeRule = function(rule, payee, ownerType) {
  // check rate type
  if('com:rateType' in rule) {
    // payee rate type must be present in rule
    if(!jsonld.hasValue(rule, 'com:rateType', payee['com:rateType'])) {
      return false;
    }
  }

  // check rate context
  if('com:rateContext' in rule) {
    // if rate context restricts to inclusive and payee is exclusive, fail
    // the rule
    var ruleInclusive = jsonld.hasValue(
      rule, 'com:rateContext', PAYEE.RATE_CONTEXT.INCLUSIVE);
    var ruleExclusive = jsonld.hasValue(
      rule, 'com:rateContext', PAYEE.RATE_CONTEXT.EXCLUSIVE);
    if(ruleInclusive && !ruleExclusive && _isPayeePercentExclusive(payee)) {
      return false;
    }

    // check other rate contexts
    var rateContexts = jsonld.getValues(payee, 'com:rateContext');
    for(var i in rateContexts) {
      if(!jsonld.hasValue(rule, 'com:rateContext', rateContexts[i])) {
        return false;
      }
    }
  }

  // check owner type
  if('com:destinationOwnerType' in rule) {
    if(!jsonld.hasValue(rule, 'com:destinationOwnerType', ownerType)) {
      return false;
    }
  }

  // check maximum rate
  if('com:maximumRate' in rule) {
    var rate = new Money(payee['com:rate']);
    var max = new Money(rule['com:maximumRate']);
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
    p.amount = new Money(p['com:rate']);
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
  initialTotal = cumulativeTotal;

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
  transaction['com:amount'] = totals.cumulative.toString();

  // create the transfer list
  var transfers = transaction['com:transfer'] = [];
  for(var i in pl) {
    var p = pl[i];
    transfers.push({
      '@type': 'com:Transfer',
      'com:forTransaction': transaction['@id'],
      'com:source': sourceId,
      'com:destination': p['com:destination'],
      'com:amount': p.amount.toString(),
      'rdfs:comment': p['rdfs:comment'] || ''
    });
  }
};

function _hasRateContext(p, context) {
  return jsonld.hasValue(p, 'com:rateContext', context);
}

function _isPayeeFlat(p) {
  // TODO: exclusive/inclusive flat payees not supported yet, assume
  // flat amount payees are exclusive
  return p['com:rateType'] === PAYEE.RATE_TYPE.FLAT;
}

function _isPayeePercentExclusive(p) {
  // percentage payees are exclusive by default, if exclusive appears or
  // inclusive doesn't appear then the payee is exclusive
  return (
    p['com:rateType'] === PAYEE.RATE_TYPE.PERCENTAGE &&
    (_hasRateContext(p, PAYEE.RATE_TYPE.EXCLUSIVE) ||
    !_hasRateContext(p, PAYEE.RATE_TYPE.INCLUSIVE)));
}

function _isPayeePercentInclusive(p) {
  // a payee is only inclusive if inclusive appears and exclusive doesn't
  return (
    p['com:rateType'] === PAYEE.RATE_TYPE.PERCENTAGE &&
    _hasRateContext(p, PAYEE.RATE_TYPE.INCLUSIVE) &&
    !_hasRateContext(p, PAYEE.RATE_TYPE.EXCLUSIVE));
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
  var tmp = new Money(p['com:rate']);
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
  if('com:minimumAmount' in p) {
    var min = new Money(p['com:minimumAmount']);
    if(tmp.compareTo(min) < 0) {
      tmp = min;
    }
  }

  // apply maximum amount
  if('com:maximumAmount' in p) {
    var max = new Money(p['com:maximumAmount']);
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
      tmp = tmp.multiply(new Money(p['com:rate']));
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
