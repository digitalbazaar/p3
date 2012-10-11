/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var util = require('util');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  money: require('./money')
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
  /** Like typical sales tax, total the applicable payees and then add a
  percentage of that amount to the total payment, increasing it. */
  PERCENT_EXCLUSIVE: 'com:PercentExclusive',
  /** Like typical income tax, leave the overall payment total the same,
  but take a percentage from each applicable payee. */
  PERCENT_INCLUSIVE: 'com:PercentInclusive'
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
api.PaySwarmError.prototype.toObject = function(options) {
  options = options || {};
  options['public'] = options['public'] || false;

  // convert error to object
  var rval = _toObject(this, options);

  // add stack trace only for non-public development conversion
  if(!options['public'] && payswarm.config.environment === 'development') {
    rval.stack = this.stack;
  }

  return rval;
};

var _genericErrorJSON = {
  message: 'An internal server error occurred.',
  type: 'payswarm.common.InternalServerError'
};

function _toObject(err, options) {
  if(!err) {
    return null;
  }

  if(options['public']) {
    // public conversion
    // FIXME also check if a validation type?
    if(err instanceof api.PaySwarmError &&
      err.details && err.details['public']) {
      // FIXME: can we assume details are mutable?
      delete err.details['public'];
      return {
        message: err.message,
        type: err.name,
        details: err.details,
        cause: _toObject(err.cause, options)
      };
    }
    else {
      // non-payswarm error or not public, return generic error
      return _genericErrorJSON;
    }
  }
  else {
    // full private conversion
    if(err instanceof api.PaySwarmError) {
      return {
        message: err.message,
        type: err.name,
        details: err.details,
        cause: _toObject(err.cause, options)
      };
    }
    else {
      return {
        message: err.message,
        type: err.name,
        details: {
          inspect: util.inspect(err, false, 10)
        },
        cause: null
      };
    }
  }
}

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
 * Gets the default PaySwarm JSON-LD context URL.
 *
 * @return the default PaySwarm JSON-LD context URL.
 */
api.getDefaultJsonLdContextUrl = function() {
  return 'http://purl.org/payswarm/v1';
};

/**
 * Gets the default PaySwarm JSON-LD context.
 *
 * @return the default PaySwarm JSON-LD context.
 */
api.getDefaultJsonLdContext = function() {
  return {
    // aliases
    'id': '@id',
    'type': '@type',

    // prefixes
    'ccard': 'http://purl.org/commerce/creditcard#',
    'com': 'http://purl.org/commerce#',
    'dc': 'http://purl.org/dc/terms/',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'gr': 'http://purl.org/goodrelations/v1#',
    'pto': 'http://www.productontology.org/id/',
    'ps': 'http://purl.org/payswarm#',
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
    'bankAccountType': {'@id': 'bank:accountType', '@type': '@id'},
    'bankRoutingNumber': 'bank:routing',

    // credit card
    'cardBrand': {'@id': 'ccard:brand', '@type': '@id'},
    'cardCvm': 'ccard:cvm',
    'cardExpMonth': {'@id': 'ccard:expMonth', '@type': 'xsd:integer'},
    'cardExpYear': {'@id': 'ccard:expYear', '@type': 'xsd:integer'},
    'cardNumber': 'ccard:number',

    // commerce
    'account': {'@id': 'com:account', '@type': '@id'},
    'accountOwnerType': {'@id': 'com:accountOwnerType', '@type': '@id'},
    'amount': 'com:amount',
    'balance': 'com:balance',
    'currency': 'com:currency',
    'destination': {'@id': 'com:destination', '@type': '@id'},
    'escrow': 'com:escrow',
    'maximumAmount': 'com:maximumAmount',
    'maximumPayeeRate': 'com:maximumPayeeRate',
    'minimumPayeeRate': 'com:minimumPayeeRate',
    'minimumAmount': 'com:minimumAmount',
    'payee': {'@id': 'com:payee', '@type': '@id', '@container': '@set'},
    'payeeRule': {'@id': 'com:payeeRule', '@type': '@id', '@container': '@set'},
    'payeeLimitation': {'@id': 'com:payeeLimitation', '@type': '@id'},
    'payeeRate': 'com:payeeRate',
    'payeeRateType': {'@id': 'com:payeeRateType', '@type': '@id'},
    'payeeGroup': {'@id': 'com:payeeGroup', '@container': '@set'},
    'payeeApplyGroup': {'@id': 'com:payeeApplyGroup', '@container': '@set'},
    'payeeExemptGroup': {'@id': 'com:payeeExemptGroup', '@container': '@set'},
    'paymentGateway': 'com:paymentGateway',
    'paymentMethod': {'@id': 'com:paymentMethod', '@type': '@id'},
    'paymentToken': 'com:paymentToken',
    'referenceId': 'com:referenceId',
    'settled': {'@id': 'com:settled', '@type': 'xsd:dateTime'},
    'source': {'@id': 'com:source', '@type': '@id'},
    'transfer': {'@id': 'com:transfer', '@type': '@id', '@container': '@set'},
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
  // 'psaPublic': 'psa:public',
  // 'psaHashedPassword': 'psa:hashedPassword',
  // 'psaHashedPasscode': 'psa:hashedPasscode',
  // 'psaValidated': 'psa:validated',
  // 'psaAddressHash': 'psa:addressHash',
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
  var target = undefined;
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
 * Buffers events for the given event emitter until it is resumed. Use this
 * method to prevent events from being emitted until you're ready to
 * resume them:
 *
 * var pause = payswarm.tools.pause(req);
 * myasync.method(function(err, next) {
 *   pause.resume();
 *   next();
 * });
 *
 * This method is taken from 'connect' but is different in that it emits the
 * buffered events on the next process tick. This allows for other synchronous
 * code to attach listeners after resuming sending events, but before those
 * events are delivered. This is particularly helpful for installing express
 * middleware that needs to perform asynchronous functions before other
 * middleware that need to receive request events.
 *
 * @param obj the event emitter.
 *
 * @return an object with a resume() method for resuming the events on the
 *         next tick, and an end() method to just drop the events.
 */
api.pause = function(obj) {
  var onData;
  var onEnd;
  var events = [];

  // buffer data
  obj.on('data', onData = function(data, encoding) {
    events.push(['data', data, encoding]);
  });

  // buffer end
  obj.on('end', onEnd = function(data, encoding) {
    events.push(['end', data, encoding]);
  });

  return {
    end: function() {
      obj.removeListener('data', onData);
      obj.removeListener('end', onEnd);
    },
    resume: function() {
      this.end();
      process.nextTick(function() {
        events.forEach(function(args) {
          obj.emit.apply(obj, args);
        });
      });
    }
  };
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

  // blind the card number
  if(card.cardNumber) {
    // show last 4 digits or as many as are available, fill rest with '*'
    var masked = card.cardNumber.replace(/.{1}(?=.{4})/g, '*');
    card.cardNumber = masked;
    // FIXME: can we leave expiration unmasked for all cards?
    // Don't mask for Discover Card
    // re: TransFirst Merchant Card Processing Operation Guide v2.209
    //     5(j)(2), 5(o)(e)
    // FIXME: Does this exception apply to other processors?
    /*if(card.cardBrand != 'ccard:Discover') {
      card.cardExpMonth = '**';
      card.cardExpYear = '**';
    }*/
  }

  // blind the CVM
  if(card.cvm) {
    card.cardCvm = '***';
  }

  return card;
};

/**
 * Blinds sensitive information in a BankAccount.
 *
 * @param account the BankAccount to blind.
 *
 * @return the blinded BankAccount.
 */
api.blindBankAccount = function(account) {
  account = api.clone(account);

  if(account.bankAccount) {
    // blind the bank account
    // show last 4 digits or as many as are available, fill rest with '*'
    account.bankAccount = account.bankAccount.replace(/.{1}(?=.{4})/g, '*');
  }
  if(account.bankRoutingNumber) {
    // blind the bank routing number
    // show last 4 digits or as many as are available, fill rest with '*'
    account.bankRoutingNumber =
      account.bankRoutingNumber.replace(/.{1}(?=.{4})/g, '*');
  }

  return account;
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

  // check payee group
  if('payeeGroup' in rule) {
    // if payee groups do not exactly match, fail the rule
    var ruleGroups = jsonld.getValues(rule, 'payeeGroup');
    var payeeGroups = jsonld.getValues(payee, 'payeeGroup');
    if(ruleGroups.length !== payeeGroups.length ||
      _.difference(ruleGroups, payeeGroups).length !== 0) {
      return false;
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

  // check minimum rate
  if('minimumPayeeRate' in rule) {
    var rate = new Money(payee.payeeRate);
    var min = new Money(rule.minimumPayeeRate);
    if(rate.compareTo(min) < 0) {
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
 * @param callback(err) called once the operation completes.
 */
api.createTransfers = function(transaction, sourceId, payees, callback) {
  /* Algorithm:

  1. Gather payees into their respective groups.
  2. Get payee dependencies for each payee.
  3. Resolve each payee until there aren't any more to resolve, raising
    an error if a cyclical dependency is detected.
  4. Create a transfer for each payee and total the transaction amount. */

  // clone list of payees to allow it to be manipulated
  payees = api.clone(payees);

  // gather payees by group
  var groups = {};
  payees.forEach(function(payee) {
    jsonld.getValues(payee, 'payeeGroup').forEach(function(group) {
      if(group in groups) {
        groups[group].push(payee);
      }
      else {
        groups[group] = [payee];
      }
    });
  });

  // calculate payee dependencies
  payees.forEach(function(payee) {
    var deps = jsonld.getValues(payee, 'payeeApplyGroup');
    if(deps.length === 0) {
      if(_isPayeeFlat(payee)) {
        // null means applies only once, not to each member of a group
        deps = null;
      }
      // percent payee
      else {
        // use all groups
        deps = _.keys(groups);
      }
    }

    if(deps) {
      // remove any exempt groups
      deps = _.difference(deps, jsonld.getValues(payee, 'payeeExemptGroup'));

      // pick unique payee dependencies from groups map
      deps = _.chain(groups).pick(deps).values().flatten().uniq().value();

      // remove any exempt individual payees
      var exemptions = jsonld.getValues(payee, 'payeeExemptGroup');
      exemptions =
        _.chain(groups).pick(exemptions).values().flatten().uniq().value();
      deps = _.difference(deps, exemptions);

      // remove self from dependencies
      deps = _.difference(deps, [payee]);
    }

    payee._deps = deps;
  });

  // resolve all payees
  var resolved = 0;
  var resolving = true;
  while(resolving) {
    var lastResolved = resolved;
    for(var i = 0; i < payees.length; ++i) {
      var payee = payees[i];
      if(payee._resolved) {
        continue;
      }

      if(_isPayeeFlat(payee)) {
        /* Flat payees w/o apply groups resolve to their rate. */
        if(!payee._deps) {
          payee._amount = new Money(payee.payeeRate);
        }
        /* Resolve to (rate) * (# of applicable payees) */
        else {
          var rate = new Money(payee.payeeRate);
          payee._amount = rate.multiply(payee._deps.length);
        }
        payee._resolved = true;
      }
      // percent payee
      else {
        /* Ensure all payee dependencies are resolved or are inclusive
        percent payees. */
        var ready = true;
        for(var n = 0; ready && n < payee._deps.length; ++n) {
          var dep = payee._deps[n];
          if(!dep._resolved && !_isPayeePercentInclusive(dep)) {
            ready = false;
          }
        }

        /* Resolve percent payee. */
        if(ready) {
          if(_isPayeePercentInclusive(payee)) {
            _resolvePayeePercentInclusive(payee);
          }
          // exclusive percent payee
          else {
            _resolvePayeePercentExclusive(payee);
          }
        }
      }

      if(payee._resolved) {
        resolved += 1;
      }
    }

    // all payees resolved, done
    if(resolved === payees.length) {
      resolving = false;
    }
    // payee cyclical dependency detected, error
    else if(lastResolved === resolved) {
      return callback(new api.PaySwarmError(
        'Could not create transfers for transaction; a cyclical payee ' +
        'dependency was detected.',
        'payswarm.financial.CyclicalPayeeDependency'));
    }
  }

  /* Now all payee transfer amounts have been calculated. */

  // create the transfer list and total transaction amount
  var total = new Money(0);
  var transfers = transaction.transfer = [];
  payees.forEach(function(payee) {
    total = total.add(payee._amount);
    transfers.push({
      type: 'com:Transfer',
      source: sourceId,
      destination: payee.destination,
      amount: payee._amount.toString(),
      comment: payee.comment || ''
    });
  });
  transaction.amount = total.toString();

  // done
  callback();
};

function _isPayeeFlat(p) {
  return p.payeeRateType === PAYEE.RATE_TYPE.FLAT;
}

function _isPayeePercentExclusive(p) {
  return p.payeeRateType === PAYEE.RATE_TYPE.PERCENT_EXCLUSIVE;
}

function _isPayeePercentInclusive(p) {
  return p.payeeRateType === PAYEE.RATE_TYPE.PERCENT_INCLUSIVE;
}

function _resolvePayeePercentExclusive(payee) {
  // total all dependencies
  var total = new Money(0);
  payee._deps.forEach(function(dep) {
    total = total.add(dep._amount);
  });

  // get percentage rate as a multiplier
  var multiplier = new Money(payee.payeeRate);
  multiplier = multiplier.divide(100);

  // apply percentage to total
  var amount = total.multiply(multiplier);

  // apply minimum amount
  if('minimumAmount' in payee) {
    var min = new Money(payee.minimumAmount);
    if(amount.compareTo(min) < 0) {
      amount = min;
    }
  }

  // apply maximum amount
  if('maximumAmount' in payee) {
    var max = new Money(payee.maximumAmount);
    if(amount.compareTo(max) > 0) {
      amount = max;
    }
  }

  // set resolved amount
  payee._amount = amount;
  payee._resolved = true;
}

function _resolvePayeePercentInclusive(payee) {
  // get percentage rate as a multiplier
  var multiplier = new Money(payee.payeeRate);
  multiplier = multiplier.divide(100);

  // iterate over each payee dependency applying the inclusive rate by
  // adding it to a total and decrementing it from the payee's amount
  var total = new Money(0);
  payee._deps.forEach(function(dep) {
    // get the portion of this dependency for the inclusive payee
    var portion = dep._amount.multiply(multiplier);

    // FIXME: should/can minimum/maximum amounts be applied?

    // subtract portion from the dependency and add it to the total
    dep._amount = dep._amount.subtract(portion);
    total = total.add(portion);
  });

  // set resolved amount
  payee._amount = total;
  payee._resolved = true;
}
