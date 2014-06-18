/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var bcrypt = require('bcrypt');
var bedrock = require('bedrock');
var crypto = require('crypto');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  money: require('./money')
};
var Money = payswarm.money.Money;
var PAYEE = payswarm.constants.PAYEE;

// extend bedrock tools
var api = bedrock.tools;
module.exports = api;

// FIXME: move some of these functions out into more appropriate modules
// such as all the payee-related stuff (should be in a module that can also
// be used client or server side, work was started on this somewhere)

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

  // blind the card number
  if(card.cardNumber) {
    // show last 4 digits or as many as are available, fill rest with '*'
    var masked = card.cardNumber.replace(/.{1}(?=.{4})/g, '*');
    card.cardNumber = masked;
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
 * Creates a unique token hash for a source of funds.
 *
 * @param source the source to create the token hash for.
 * @param callback(err, hash) called once the operation completes.
 */
api.getTokenHash = function(source, callback) {
  var data = [];

  if(jsonld.hasValue(source, 'type', 'CreditCard')) {
    data.push(source.cardBrand);
    data.push(source.cardNumber);
    data.push(source.cardExpMonth);
    data.push(source.cardExpYear);
  } else if(jsonld.hasValue(source, 'type', 'BankAccount')) {
    data.push(source.bankAccount);
    data.push(source.bankRoutingNumber);
  } else {
    return callback(new api.PaySwarmError(
      'Could not create token hash; unsupported token source type.',
      'payswarm.financial.InvalidTokenSourceType',
      {'public': true, httpStatusCode: 400}));
  }

  // sha-256 hash of data
  var md = crypto.createHash('sha256');
  md.update(data.join(':'), 'utf8');
  var hash = 'urn:sha256:' + md.digest('hex');

  // bcrypt hash of sha-256 hash
  var salt = payswarm.config.financial.sharedPaymentTokenSalt;
  bcrypt.hash(hash, salt, function(err, hash) {
    callback(err, 'urn:bcrypt:' + hash);
  });
};

/**
 * Determines whether or not the given Asset or Listing's purchase validity
 * period has passed (against the current day and time).
 *
 * @param assetOrListing the Asset or Listing to check.
 *
 * @return 0 if the validity period still applies, -1 if it is in the past,
 *           1 if it is in the future.
 */
api.checkPurchaseValidity = function(assetOrListing) {
  var now = new Date();

  var validFrom = [];
  var validUntil = [];

  if(jsonld.hasValue(assetOrListing, 'type', 'Asset')) {
    // asset
    var restrictions = jsonld.getValues(assetOrListing, 'listingRestrictions');
    if(restrictions.length > 0) {
      validFrom = jsonld.getValues(restrictions[0], 'validFrom');
      validUntil = jsonld.getValues(restrictions[0], 'validUntil');
    }
  } else {
    // listing
    validFrom = jsonld.getValues(assetOrListing, 'validFrom');
    validUntil = jsonld.getValues(assetOrListing, 'validUntil');
  }

  if(validFrom.length === 0) {
    validFrom = now;
  } else {
    validFrom = new Date(validFrom[0]);
  }
  if(validUntil.length === 0) {
    validUntil = now;
  } else {
    validUntil = new Date(validUntil[0]);
  }

  if(now > validUntil) {
    return -1;
  }
  if(now < validFrom) {
    return 1;
  }
  return 0;
};

/**
 * Checks to see if a PayeeRule applies to the given Payee, permitting it
 * to be added to a Transaction.
 *
 * @param rule the PayeeRule to check.
 * @param payee the Payee to check.
 *
 * @return true if the PayeeRule applies, false if not.
 */
api.checkPayeeRule = function(rule, payee) {
  if('payeeLimitation' in rule) {
    // any payee fails this rule
    if(rule.payeeLimitation === 'NoAdditionalPayeesLimitation') {
      return false;
    }
  }

  // check destinations
  if('destination' in rule) {
    // if payee destination is not in the set, fail the rule
    if(!jsonld.hasValue(rule, 'destination', payee.destination)) {
      return false;
    }
  }

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

  // check payee group prefix
  if('payeeGroupPrefix' in rule) {
    // if there is no matching prefix for each group, fail the rule
    var prefixes = jsonld.getValues(rule, 'payeeGroupPrefix');
    var payeeGroups = jsonld.getValues(payee, 'payeeGroup');
    var pass = true;
    for(var i = 0; i < payeeGroups.length; ++i) {
      var group = payeeGroups[i];
      pass = false;
      for(var p = 0; !pass && p < prefixes.length; ++p) {
        if(group.indexOf(prefixes[p]) === 0) {
          pass = true;
        }
      }
      if(!pass) {
        return false;
      }
    }
  }

  // check payee apply after
  if('payeeApplyAfter' in rule) {
    // if payee apply after does not include all members, fail
    var ruleGroups = jsonld.getValues(rule, 'payeeApplyAfter');
    var payeeGroups = jsonld.getValues(payee, 'payeeApplyAfter');
    if(_.intersection(ruleGroups, payeeGroups).length !== ruleGroups.length) {
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
 * Ensures that the given Payees are not members of payee groups that begin
 * with any reserved words.
 *
 * @param payees the Payees to check.
 * @param callback(err) called once the operation completes.
 */
api.checkPayeeGroups = function(payees, callback) {
  // 'authority' and 'payswarm' are reserved payee group prefixes
  for(var i = 0; i < payees.length; ++i) {
    var payee = payees[i];
    var groups = jsonld.getValues(payee, 'payeeGroup');
    for(var g = 0; g < groups.length; ++g) {
      var group = groups[g];
      if(group.indexOf('authority') === 0 || group.indexOf('payswarm') === 0) {
        return callback(new api.PaySwarmError(
          'Payee groups must not begin with the text "authority" ' +
          'or "payswarm". These group prefixes are reserved for PaySwarm ' +
          'Authority use only.',
          'payswarm.financial.InvalidPayeeGroup', {
            'public': true,
            payee: payee
          }));
      }
    }
  }
  callback();
};

/**
 * Creates Transfers for the given Transaction based on the given list
 * of Payees. The list of Transfers and the total Transaction amount
 * will be set on the Transaction.
 *
 * @param transaction the Transaction to create Transfers for.
 * @param sourceId the source FinancialAccount/PaymentToken id.
 * @param payees the list of Payees to process.
 * @param callback(err) called once the operation completes.
 */
api.createTransfers = function(transaction, sourceId, payees, callback) {
  // ensure currency was set in the transaction
  if(!('currency' in transaction)) {
    // This is not public since it is currently a server error if not set.
    return callback(new api.PaySwarmError(
      'Transaction missing currency.',
      'payswarm.financial.InvalidTransaction', {'public': true}));
  }

  // ensure transaction currency matches each payee
  var txnCurrency = jsonld.getValues(transaction, 'currency')[0];
  for(var i = 0; i < payees.length; ++i) {
    var payee = payees[i];
    var payeeCurrency = jsonld.getValues(payee, 'currency');
    if(payeeCurrency.length === 0 || payeeCurrency[0] !== txnCurrency) {
      return callback(new api.PaySwarmError(
        'Transaction currency does not match payee currency.',
        'payswarm.financial.InvalidTransaction',
        {'public': true, currency: txnCurrency, payee: payee}));
    }
  }

  // checks may be needed to ensure all payees were processed with the proper
  // currency. This check might be better in another function but all txns
  // currently go through this function so it was put here until more work is
  // done on other currency issues.

  /* Algorithm:

  1. Gather payees into their respective groups.
  2. Get payee dependencies for each payee.
  3. Resolve each payee until there aren't any more to resolve, raising
    an error if a dependency cannot be met.
  4. Create a transfer for each payee and total the transaction amount. */

  // clone list of payees to allow it to be manipulated
  payees = api.clone(payees);

  // gather payees by group
  var groups = {};
  for(var i = 0; i < payees.length; ++i) {
    var payee = payees[i];

    // ensure rate type is specified
    if(!('payeeRateType' in payee) ||
      !(payee.payeeRateType === PAYEE.RATE_TYPE.FLAT||
      payee.payeeRateType === PAYEE.RATE_TYPE.PERCENTAGE)) {
      return callback(new api.PaySwarmError(
        'Invalid Payee rate type.',
        'payswarm.financial.InvalidPayee', {'public': true, payee: payee}));
    }

    // ensure a payee group is specified
    var payeeGroups = jsonld.getValues(payee, 'payeeGroup');
    if(payeeGroups.length === 0) {
      return callback(new api.PaySwarmError(
        'Invalid Payee; no Payee group specified.',
        'payswarm.financial.InvalidPayee', {'public': true, payee: payee}));
    }

    // ensure apply type is specified
    if(!('payeeApplyType' in payee) ||
      !(payee.payeeApplyType === PAYEE.APPLY_TYPE.EXCLUSIVE ||
      payee.payeeApplyType === PAYEE.APPLY_TYPE.INCLUSIVE)) {
      return callback(new api.PaySwarmError(
        'Invalid Payee apply type.',
        'payswarm.financial.InvalidPayee', {'public': true, payee: payee}));
    }

    // validate minimumAmount and maximumAmount
    if('minimumAmount' in payee &&
      new Money(payee.minimumAmount).isNegative()) {
      return callback(new api.PaySwarmError(
        'Invalid Payee minimumAmount.',
        'payswarm.financial.InvalidPayee', {'public': true, payee: payee}));
    }
    if('maximumAmount' in payee &&
      new Money(payee.maximumAmount).isNegative()) {
      return callback(new api.PaySwarmError(
        'Invalid Payee maximumAmount.',
        'payswarm.financial.InvalidPayee', {'public': true, payee: payee}));
    }
    if('minimumAmount' in payee && 'maximumAmount' in payee) {
      var min = new Money(payee.minimumAmount || 0);
      var max = new Money(payee.maximumAmount || 0);
      if(min.compareTo(max) === 1) {
        return callback(new api.PaySwarmError(
          'Invalid Payee minimumAmount and maximumAmount.',
          'payswarm.financial.InvalidPayee', {'public': true, payee: payee}));
      }
    }

    payeeGroups.forEach(function(group) {
      if(group in groups) {
        groups[group].push(payee);
      } else {
        groups[group] = [payee];
      }
    });
  }

  // calculate payee dependencies
  payees.forEach(function(payee) {
    var deps = jsonld.getValues(payee, 'payeeApplyGroup');
    if(deps.length === 0) {
      if(_isPayeeFlat(payee) && _isPayeeExclusive(payee)) {
        // null means applies only once, not to each member of a group
        deps = null;
      } else {
        // inclusive flat or percent payee
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
      // set payees to apply to
      payee._apply = _.clone(deps);
    }

    // add payees that are not applicable but must finish first
    var after = jsonld.getValues(payee, 'payeeApplyAfter');
    if(after.length > 0) {
      // get unique payees from after groups
      after = _.chain(groups).pick(after).values().flatten().uniq().value();
      // remove self
      after = _.difference(after, [payee]);
      // add to deps, make unique
      deps = _.uniq(deps.concat(after));
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

      if(_isPayeeFlat(payee) && _isPayeeExclusive(payee)) {
        if(!payee._apply) {
          /* Exclusive flat payees w/o apply groups resolve to their rate. */
          payee._amount = new Money(payee.payeeRate);
        } else {
          /* Resolve to (rate) * (# of applicable payees) */
          var rate = new Money(payee.payeeRate);
          payee._amount = rate.multiply(payee._apply.length);
        }
        payee._originalAmount = payee._amount;
        payee._after = {};
        payee._resolved = true;
      } else {
        // inclusive flat amount or percent payee
        /* Ensure all payee dependencies are resolved. */
        var ready = true;
        for(var n = 0; ready && n < payee._deps.length; ++n) {
          var dep = payee._deps[n];
          if(!dep._resolved) {
            ready = false;
          }
        }

        /* Resolve payee. */
        if(ready) {
          if(_isPayeeFlat(payee)) {
            // inclusive flat payee
            _resolvePayeeFlatInclusive(payee);
          } else if(_isPayeeInclusive(payee)) {
            // inclusive percent payee
            _resolvePayeePercentInclusive(payee);
          } else {
            // exclusive percent payee
            _resolvePayeePercentExclusive(payee);
          }

          if(!payee._resolved) {
            return callback(new api.PaySwarmError(
              'Invalid Payee inclusive rate; a negative Payee amount would ' +
              'result from the given rate.',
              'payswarm.financial.InvalidPayee',
              {
                'public': true
                // FIXME: adding payee can result in cyclical JSON errors
                //payee: payee
              }));
          }
        }
      }

      if(payee._resolved) {
        resolved += 1;
      }
    }

    if(resolved === payees.length) {
      // all payees resolved, done
      resolving = false;
    } else if(lastResolved === resolved) {
      // dependency that cannot be met detected, error
      return callback(new api.PaySwarmError(
        'Could not create transfers for transaction; a payee ' +
        'dependency could not be met.',
        'payswarm.financial.InvalidPayeeDependency'));
    }
  }

  /* Now all payee transfer amounts have been calculated. */

  // create the transfer list and total transaction amount
  var total = new Money(0);
  var transfers = transaction.transfer = [];
  payees.forEach(function(payee) {
    total = total.add(payee._amount);
    transfers.push({
      type: 'Transfer',
      source: sourceId,
      destination: payee.destination,
      amount: payee._amount.toString(),
      currency: payee.currency,
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

function _isPayeeExclusive(p) {
  return p.payeeApplyType === PAYEE.APPLY_TYPE.EXCLUSIVE;
}

function _isPayeeInclusive(p) {
  return p.payeeApplyType === PAYEE.APPLY_TYPE.INCLUSIVE;
}

function _setPayeeApplyAfterAmount(payee, target) {
  // update apply after for each member group
  var after = jsonld.getValues(payee, 'payeeGroup');
  after.forEach(function(group) {
    target._after[group] = target._amount;
  });
}

function _getPayeeApplyAfterAmount(payee, target) {
  // use the lowest amount from a matching group
  var min = target._originalAmount;
  var after = jsonld.getValues(payee, 'payeeApplyAfter');
  after.forEach(function(group) {
    if(group in target._after) {
      if(target._after[group].compareTo(min) < 0) {
        min = target._after[group];
      }
    }
  });

  return min;
}

function _resolvePayeeFlatInclusive(payee) {
  // get the total amount for all applicable payees
  var total = new Money(0);
  payee._apply.forEach(function(p) {
    total = total.add(p._amount);
  });

  // do not resolve payee if remainder would be negative
  var remainder = total.subtract(payee.payeeRate);
  if(remainder.isNegative()) {
    return;
  }

  // get multiplier for dependencies
  var multiplier = new Money(payee.payeeRate).divide(total);

  // iterate over each applicable payee applying the multiplier and adding
  // the result to the resolving payee amount and decrementing it from the
  // applicable payee's amount
  var amount = new Money(0);
  for(var i = 0; i < payee._apply.length; ++i) {
    var p = payee._apply[i];

    // get the portion of this dependency for the inclusive payee
    var portion;

    // single dependency, assign full portion cleanly
    if(payee._apply.length === 1) {
      portion = new Money(payee.payeeRate);
    } else {
      portion = p._amount.multiply(multiplier);
    }

    // subtract portion from the dependency and add it to the amount
    p._amount = p._amount.subtract(portion);
    amount = amount.add(portion);

    // do not resolve payee if applicable payee amount goes negative or
    // below minimum amount
    if(p._amount.isNegative()) {
      return;
    }
    if('minimumAmount' in p) {
      var min = new Money(p.minimumAmount);
      if(p._amount.compareTo(min) < 0) {
        return;
      }
    }

    // update "after" group amounts
    _setPayeeApplyAfterAmount(payee, p);
  }

  // set resolved amount
  payee._amount = amount;
  payee._originalAmount = amount;
  payee._after = {};
  payee._resolved = true;
}

function _resolvePayeePercentExclusive(payee) {
  // total all applicable payees
  var total = new Money(0);
  payee._apply.forEach(function(p) {
    total = total.add(p._amount);
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
  payee._originalAmount = amount;
  payee._after = {};
  payee._resolved = true;
}

function _resolvePayeePercentInclusive(payee) {
  // get percentage rate as a multiplier
  var multiplier = new Money(payee.payeeRate);
  multiplier = multiplier.divide(100);

  // iterate over each applicable payee applying the multiplier and adding
  // the result to the resolving payee amount and decrementing it from the
  // applicable payee's amount
  var total = new Money(0);
  for(var i = 0; i < payee._apply.length; ++i) {
    var p = payee._apply[i];

    // get the portion of this applicable payee for the inclusive payee
    // based on the minimum after amount of the applicable payee
    var portion = _getPayeeApplyAfterAmount(payee, p).multiply(multiplier);

    // subtract portion from the applicable payee and add it to the total
    p._amount = p._amount.subtract(portion);
    total = total.add(portion);

    // do not resolve payee if applicable payee amount goes negative or
    // below minimum amount
    if(p._amount.isNegative()) {
      return;
    }
    if('minimumAmount' in p) {
      var min = new Money(p.minimumAmount);
      if(p._amount.compareTo(min) < 0) {
        return;
      }
    }

    // update "after" group amounts
    _setPayeeApplyAfterAmount(payee, p);
  }

  // get difference between total and min/max
  var diff = new Money(0);

  // apply minimum amount
  if('minimumAmount' in payee) {
    var min = new Money(payee.minimumAmount);
    if(total.compareTo(min) < 0) {
      diff = total.subtract(min);
      total = min;
    }
  }

  // apply maximum amount
  if('maximumAmount' in payee) {
    var max = new Money(payee.maximumAmount);
    if(total.compareTo(max) > 0) {
      diff = total.subtract(max);
      total = max;
    }
  }

  // get difference to apply to each applicable payee
  if(!diff.isZero()) {
    var each = diff.divide(payee._apply.length);
    for(var i = 0; i < payee._apply.length; ++i) {
      var p = payee._apply[i];

      // add difference to applicable payee
      p._amount = p._amount.add(each);

      // do not resolve payee if applicable payee amount goes negative
      if(p._amount.isNegative()) {
        return;
      }

      // update "after" group amounts
      _setPayeeApplyAfterAmount(payee, p);
    }
  }

  // set resolved amount
  payee._amount = total;
  payee._originalAmount = total;
  payee._after = {};
  payee._resolved = true;
}

// properties to skip while building keywords
var _keywordPropertyBlacklist = _(['id', 'type']);

/**
 * Gets the searchable keywords from an Asset.
 *
 * @param asset the Asset to get searchable keywords from.
 *
 * @return the keywords.
 */
api.getAssetKeywords = function(asset) {
  var text = '';
  var titles = jsonld.getValues(asset, 'title');
  var creators = jsonld.getValues(asset, 'creator');

  // add text from title
  titles.forEach(function(title) {
    text += ' ' + title;
  });

  // add text from creators
  creators.forEach(function(creator) {
    if(_.isString(creator)) {
      text += ' ' + creator;
    } else if(_.isObject(creator)) {
      _.each(creator, function(value, key) {
        if(_keywordPropertyBlacklist.contains(key)) {
          return;
        }
        if(_.isString(value)) {
          text += ' ' + value;
        }
      });
    }
  });

  // remove all punctuation and split on whitespace
  var keywords = text.toLowerCase().replace(/[^a-z0-9~\-_]/g, ' ').split(/\s/);

  // remove empty keywords and make them unique
  return _.uniq(_.filter(keywords, function(value) {
    return value.length > 0;
  }));
};
