/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  money: require('./money'),
  permission: require('./permission'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools')
};
var util = require('util');
var PaySwarmError = payswarm.tools.PaySwarmError;
var Money = require('./money').Money;

// constants
var MODULE_TYPE = payswarm.financial.type;
var MODULE_IRI = payswarm.financial.iri;

// module permissions
var PERMISSIONS = {
  BUDGET_ADMIN: MODULE_IRI + '#budget_admin',
  BUDGET_ACCESS: MODULE_IRI + '#budget_access',
  BUDGET_CREATE: MODULE_IRI + '#budget_create',
  BUDGET_EDIT: MODULE_IRI + '#budget_edit',
  BUDGET_REMOVE: MODULE_IRI + '#budget_remove'
};

// sub module API
var api = {};
module.exports = api;

// distributed ID generator
var budgetIdGenerator = null;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['budget'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'budget',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'budget',
        fields: {owner: 1, vendors: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      payswarm.db.getDistributedIdGenerator('budget',
        function(err, idGenerator) {
          if(!err) {
            budgetIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
};

/**
 * Creates a Budget ID from the given Identity ID and Budget slug.
 *
 * @param ownerId the Identity ID.
 * @param name the short Budget name (slug).
 *
 * @return the Budget ID.
 */
api.createBudgetId = function(ownerId, name) {
  return util.format('%s/budgets/%s', ownerId, encodeURIComponent(name));
};

/**
 * Creates a new BudgetId based on the owner's IdentityId.
 *
 * @param ownerId the ID of the Identity that owns the Budget.
 * @param callback(err, id) called once the operation completes.
 */
api.generateBudgetId = function(ownerId, callback) {
  budgetIdGenerator.generateId(function(err, id) {
    if(err) {
      return callback(err);
    }
    callback(null, api.createBudgetId(ownerId, id));
  });
};

/**
 * Creates a new Budget. The "id", "type", "owner", and "amount" properties
 * must be set.
 *
 * @param actor the Profile performing the action.
 * @param budget the new Budget to create.
 * @param callback(err, record) called once the operation completes.
 */
api.createBudget = function(actor, budget, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, budget,
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_CREATE,
        payswarm.identity.checkIdentityObjectOwner, callback);
    },
    function(callback) {
      // populate budget source
      payswarm.financial.getAccount(actor, budget.source,
        function(err, account) {
          callback(err, account);
        });
    },
    function(account, callback) {
      _checkLimits(budget, account, callback);
    },
    function(callback) {
      // sanitize budget
      _sanitizeBudget(budget);

      payswarm.logger.debug('creating budget', budget);

      // clear vendor field
      budget.vendor = [];

      // insert budget
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(budget.id),
        owner: payswarm.db.hash(budget.owner),
        // adding budget is a hack to prevent duplicate error w/no vendors
        vendors: [payswarm.db.hash(budget.id)],
        updateId: 0,
        meta: {
          created: now,
          updated: now
        },
        budget: budget
      };
      payswarm.db.collections.budget.insert(
        record, payswarm.db.writeOptions, function(err, records) {
          if(err) {
            return callback(err);
          }
          callback(null, records[0]);
        });
    }
  ], callback);
};

/**
 * Gets the Budget by ID. If an expired Budget is found it will be removed
 * and treated as if it didn't exist. If a Budget needs to be refreshed,
 * it will be.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Budget to retrieve.
 * @param callback(err, budget, meta) called once the operation completes.
 */
api.getBudget = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.budget.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Budget not found.',
          MODULE_TYPE + '.BudgetNotFound',
          {id: id}));
      }
      callback(null, record.budget, record.meta);
    },
    function(budget, meta, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, budget,
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_ACCESS,
        _checkBudgetOwner, function(err) {
          callback(err, budget, meta);
        });
    },
    function(budget, meta, callback) {
      // update budget
      _updateBudgets([{budget: budget}], function(err, records) {
        if(!err) {
          if(records.length === 0) {
            return callback(new PaySwarmError(
              'Budget not found.',
              MODULE_TYPE + '.BudgetNotFound',
              {id: id}));
          }
          return callback(null, budget, meta);
        }
        callback(err);
      });
    }
  ], callback);
};

/**
 * Retrieves all Budgets owned by a particular Identity. If an expired Budget
 * is found it will be removed and treated as if it didn't exist. If a Budget
 * needs to be refreshed, it will be.
 *
 * @param actor the Profile performing the action.
 * @param identityId the ID of the Identity to get the Budgets for.
 * @param vendorId the vendorId to filter on (optional).
 * @param callback(err, records) called once the operation completes.
 */
api.getIdentityBudgets = function(actor, identityId) {
  var vendorId = null;
  var callback;
  if(arguments.length === 3) {
    callback = arguments[2];
  }
  else {
    vendorId = arguments[2];
    callback = arguments[3];
  }

  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: identityId},
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_ACCESS,
        payswarm.identity.checkIdentityOwner, callback);
    },
    function(callback) {
      var query = {owner: payswarm.db.hash(identityId)};
      if(vendorId) {
        query.vendors = payswarm.db.hash(vendorId);
      }
      payswarm.db.collections.budget.find(query, {}).toArray(callback);
    },
    _updateBudgets
  ], callback);
};

/**
 * Gets Budgets based on the given query. If an expired Budget is found it will
 * be removed and treated as if it didn't exist. If a Budget needs to be
 * refreshed, it will be.
 *
 * @param actor the Profile performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param callback(err, records) called once the operation completes.
 *
 * @return true on success, false on failure with exception set.
 */
api.getBudgets = function(actor, query, fields, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  }
  else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  }

  query = query || {};
  fields = fields || {};
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.BUDGET_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.budget.find(query, fields).toArray(callback);
    },
    _updateBudgets
  ], callback);
};

/**
 * Updates an existing Budget. Use this method to change the Budget
 * parameters, do not use it to change the Budget's remaining balance or
 * its applicable vendors. Other than id only updated fields need to
 * be included.
 *
 * @param actor the Profile performing the action.
 * @param budgetUpdate the Budget with id and fields to update.
 * @param callback(err) called once the operation completes.
 */
api.updateBudget = function(actor, budgetUpdate, callback) {
  async.auto({
    checkPermission: function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: budgetUpdate.id},
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, callback);
    },
    getBudget: ['checkPermission', function(callback) {
      // Note: The budget is used to get the old source for use in checking
      // the currency for a new source is acceptable. Other uses of data in
      // the budget may have race conditions.
      // FIXME: Just add currency to budget to avoid this extra check?
      payswarm.financial.getBudget(actor, budgetUpdate.id,
        function(err, budget) {
          callback(err, budget);
        });
    }],
    getOldAccount: ['getBudget', function(callback) {
      var source = budgetUpdate.source || getBudget.budget.source;
      payswarm.financial.getAccount(actor, source,
        function(err, account) {
          callback(err, account);
        });
    }],
    getNewAccount: ['getOldAccount', function(callback, results) {
      if(!('source' in budgetUpdate)) {
        return callback(null, results.getOldAccount);
      }
      payswarm.financial.getAccount(actor, budgetUpdate.source,
        function(err, account) {
          callback(err, account);
        });
    }],
    checkAccount: ['getOldAccount', 'getNewAccount',
      function(callback, results) {
      // check currency matches
      if(results.getOldAccount.currency === results.getNewAccount.currency) {
        return callback();
      }
      callback(new PaySwarmError(
        'New source account currency must match old source account.',
        MODULE_TYPE + '.InvalidBudget',
        {httpStatusCode: 400, 'public': true}));
    }],
    checkLimits: ['getNewAccount', function(callback, results) {
      if(!('amount' in budgetUpdate)) {
        return callback();
      }
      _checkLimits(budgetUpdate, results.getNewAccount, callback);
    }],
    sanitizeBudget: ['checkLimits', function(callback, results) {
      // remove restricted fields
      budgetUpdate = payswarm.tools.clone(budgetUpdate);
      delete budgetUpdate.balance;
      delete budgetUpdate.owner;
      delete budgetUpdate.vendor;
      _sanitizeBudget(budgetUpdate, results.getBudget);
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(budgetUpdate.id)},
        {$set: payswarm.db.buildUpdate(budgetUpdate, 'budget')},
        payswarm.db.writeOptions,
        callback);
    }],
    checkResult: ['sanitizeBudget', function(callback, results) {
      var result = results.sanitizeBudget;
      var n = result[0];
      if(n !== 0) {
        return callback();
      }
      callback(new PaySwarmError(
        'Could not update Budget. Budget not found.',
        MODULE_TYPE + '.BudgetNotFound',
        {httpStatusCode: 404, 'public': true}));
    }]
  }, function(err, results) {
    callback(err);
  });
};

/**
 * Removes a Budget based on its ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Budget to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeBudget = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_REMOVE,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.budget.remove(
        {id: payswarm.db.hash(id)},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Updates the remaining balance on the given Budget.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Budget to update.
 * @param amountOrDate the Money amount to change the Budget balance by (+/-)
 *          or a Date to refresh the Budget and mark it as refreshed on the
 *          given Date.
 * @param callback(err) called once the operation completes.
 */
api.updateBudgetBalance = function(actor, id, amountOrDate, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      _atomicUpdateBalance(id, amountOrDate, callback);
    }
  ], callback);
};

/**
 * Adds a vendor to a Budget. If the vendor was in another Budget, it will
 * be removed from that other Budget.
 *
 * @param actor the Profile performing the action.
 * @param budgetId the ID of the Budget.
 * @param vendorId the ID of the vendor to add.
 * @param callback(err) called once the operation completes.
 */
api.addBudgetVendor = function(actor, budgetId, vendorId, callback) {
  var vendorHash = payswarm.db.hash(vendorId);
  async.waterfall([
    function(callback) {
      api.getBudget(actor, budgetId, function(err, budget) {
        callback(err, budget);
      });
    },
    function(budget, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, budget,
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, function(err) {
          if(err) {
            return callback(err);
          }
          callback(null, budget);
        });
    },
    function(budget, callback) {
      // remove vendor from any other owned budget
      payswarm.db.collections.budget.update(
        {owner: payswarm.db.hash(budget.owner), vendors: vendorHash},
        {$pull: {vendors: vendorHash, 'budget.vendor': vendorId}},
        payswarm.db.writeOptions,
        function(err) {
          callback(err);
        });
    },
    function(callback) {
      // add vendor to budget
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(budgetId)},
        {$addToSet: {vendors: vendorHash, 'budget.vendor': vendorId}},
        payswarm.db.writeOptions,
        function(err) {
          callback(err);
        });
    }
  ], callback);
};

/**
 * Removes a vendor from a Budget.
 *
 * @param actor the Profile performing the action.
 * @param budgetId the ID of the Budget.
 * @param vendorId the ID of the vendor to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeBudgetVendor = function(actor, budgetId, vendorId, callback) {
  var vendorHash = payswarm.db.hash(vendorId);
  async.waterfall([
    function(callback) {
      api.getBudget(actor, budgetId, function(err, budget) {
        callback(err, budget);
      });
    },
    function(budget, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, budget,
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      // remove vendor from budget
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(budgetId)},
        {$pull: {vendors: vendorHash, 'budget.vendor': vendorId}},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Sanitizes a Budget by adding any missing fields, etc.
 *
 * @param budget the Budget to sanitize.
 * @param oldBudget the oldBudget if doing an update.
 */
function _sanitizeBudget(budget, oldBudget) {
  if(!oldBudget) {
    // Creating a new budget
    jsonld.addValue(budget, 'type', 'psa:Budget', {allowDuplicate: false});

    // set balance if not set
    budget.balance = budget.balance || budget.amount;

    // ensure balance is not greater than amount
    var balance = new Money(budget.balance);
    var amount = new Money(budget.amount);
    if(balance.compareTo(amount) > 0) {
      balance = amount;
    }

    // set max per use to amount if not set
    var psaMaxPerUse;
    if(!('psaMaxPerUse' in budget)) {
      psaMaxPerUse = budget.amount;
    }
    else {
      // ensure psaMaxPerUse is not greater than amount
      psaMaxPerUse = new Money(budget.psaMaxPerUse);
      if(psaMaxPerUse.compareTo(amount) > 0) {
        psaMaxPerUse = amount;
      }
    }

    // normalize monetary amounts
    budget.balance = balance.toString();
    budget.amount = amount.toString();
    budget.psaMaxPerUse = psaMaxPerUse.toString();

    // set refresh to never if not set
    if(!('psaRefresh' in budget)) {
      budget.psaRefresh = 'psa:Never';
    }
  }
  else {
    // Updating a budget

    // normalize monetary amounts
    if('amount' in budget) {
      // ensure balance is not greater than amount
      var balance = new Money(oldBudget.balance);
      var amount = new Money(budget.amount);
      if(balance.compareTo(amount) > 0) {
        budget.balance = amount.toString();
      }
      budget.amount = amount.toString();
    }
    if('psaMaxPerUse' in budget) {
      // ensure psaMaxPerUse is not greater than amount
      var amount = new Money(budget.amount || oldBudget.amount);
      var psaMaxPerUse = new Money(budget.psaMaxPerUse);
      if(psaMaxPerUse.compareTo(amount) > 0) {
        psaMaxPerUse = amount;
      }
      budget.psaMaxPerUse = psaMaxPerUse.toString();
    }
  }

  // set refreshed to now if not set
  if('psaRefreshed' in budget) {
    // coerce to an integer
    budget.psaRefreshed = parseInt(budget.psaRefreshed);
  }
  else if(!oldBudget) {
    // use current time
    budget.psaRefreshed = Math.floor(+new Date()/1000);
  }

  // coerce to an integer
  if('psaExpires' in budget) {
    var i = parseInt(budget.psaExpires);

    // relative expires if < ~13 months
    if(i <= ((365 + 30) * 24 * 60 * 60)) {
      i += Math.floor(+new Date()/1000);
    }
    budget.psaExpires = i;
  }
  // set expiration to forever if not set
  else if(!oldBudget) {
    budget.psaExpires = 0xffffffff;
  }
}

/**
 * Updates the given Budget records, removing expired Budgets and refreshing
 * stale Budgets.
 *
 * @param records the Budget records.
 * @param callback(err, records) called once the operation completes.
 */
function _updateBudgets(records, callback) {
  var budgets = [];
  async.forEachSeries(records, function(record, callback) {
    var budget = record.budget;

    // expire budget if old
    var now = new Date();
    var secs = Math.floor(+now/1000);
    if('psaExpires' in budget && budget.psaExpires <= secs) {
      return payswarm.db.collections.budget.remove(
        {id: payswarm.db.hash(budget.id)},
        payswarm.db.writeOptions, callback);
    }

    // budget not expiring
    budgets.push(record);

    // refresh budget if necessary
    if(_mustRefresh(budget, now)) {
      return _atomicUpdateBalance(budget.id, now, function(err) {
        if(!err) {
          budget.psaRefreshed = Math.floor(+now/1000);
          budget.balance = budget.amount;
        }
        callback(err);
      });
    }
    callback();
  }, function(err) {
    callback(err, budgets);
  });
}

/**
 * A helper function that asynchronously loops until a Budget balance has
 * been updated or an error occurs.
 *
 * @param id the ID of the Budget.
 * @param amountOrDate the Money amount to change the balance by or a Date to
 *          refresh the Budget and mark it as refreshed on the given Date.
 * @param callback(err) called once the operation completes.
 */
function _atomicUpdateBalance(id, amountOrDate, callback) {
  var done = false;
  async.until(function() {return done;}, function(callback) {
    _updateBalance(id, amountOrDate, function(err, updated) {
      done = updated;
      callback(err);
    });
  }, callback);
}

/**
 * A helper function called internally to update a Budget balance.
 *
 * @param id the ID of the Budget.
 * @param amountOrDate the Money amount to change the balance by or a Date to
 *          refresh the Budget and mark it as refreshed on the given Date.
 * @param callback(err, updated) called once the operation completes.
 */
function _updateBalance(id, amountOrDate, callback) {
  var updated = false;
  async.waterfall([
    function(callback) {
      payswarm.db.collections.budget.findOne(
        {id: payswarm.db.hash(id)}, {
          updateId: true,
          'budget.amount': true,
          'budget.balance': true,
          'budget.psaMaxPerUse': true
        }, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Budget not found',
          MODULE_TYPE + '.BudgetNotFound'));
      }

      var budget = record.budget;

      if(amountOrDate instanceof Money) {
        // ensure amount is not greater than maxPerUse restriction
        var maxPerUse = new Money(budget.psaMaxPerUse);
        if(amountOrDate.compareTo(maxPerUse) > 0) {
          return callback(new PaySwarmError(
            'Could not update budget balance by the specified amount. ' +
            'The budget restricts the maximum amount that can be deducted ' +
            'from its balance in a single use.',
            MODULE_TYPE + '.BudgetRestriction',
            {budget: id, httpStatusCode: 400, 'public': true}));
        }
      }

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update object
      var update = {$set: {updateId: updateId}};

      // update balance
      var balance = new Money(budget.balance);
      if(amountOrDate instanceof Date) {
        // refresh balance, set refreshed date
        balance = new Money(budget.amount);
        update.$set['budget.psaRefreshed'] =
          Math.floor(+amountOrDate/1000);
      }
      else {
        // add amount
        balance = balance.add(amountOrDate);
      }

      // check if over budget
      if(balance.isNegative()) {
        return callback(new PaySwarmError(
          'Could not update budget balance by the specified amount. ' +
          'The budget would be exceeded.',
          MODULE_TYPE + '.BudgetExceeded',
          {budget: id, httpStatusCode: 400, 'public': true}));
      }

      // cap balance at maximum amount for budget
      var max = new Money(budget.amount);
      if(balance.compareTo(max) >= 0) {
        balance = max;
      }

      // attempt to update balance (ensure updateId matches)
      update.$set['budget.balance'] = balance.toString();
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(id), updateId: record.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      // budget updated if record was affected
      updated = (n === 1);
      callback();
    }
  ], function(err) {
    callback(err, updated);
  });
}

/**
 * Determines if a Budget must be refreshed or not.
 *
 * @param budget the Budget to potentially refresh.
 * @param now the current Date.
 *
 * @return true if the Budget needs refreshing, false if not.
 */
function _mustRefresh(budget, now) {
  var rval = false;

  // FIXME: decide if IRIs used for refresh or something else
  if('psaRefresh' in budget && budget.psaRefresh !== 'psa:Never') {
    var refreshed = new Date(budget.psaRefreshed * 1000);
    if(now.getSeconds() > refreshed.getSeconds()) {
      rval = (
        (budget.psaRefresh === 'psa:Hourly' &&
        _refreshHourly(now, refreshed)) ||
        (budget.psaRefresh === 'psa:Daily' &&
        _refreshDaily(now, refreshed)) ||
        (budget.psaRefresh === 'psa:Monthly' &&
        _refreshMonthly(now, refreshed)) ||
        (budget.psaRefresh === 'psa:Yearly' &&
        _refreshYearly(now, refreshed))
      );
    }
  }

  return rval;
}

// return true if 'now' is after 'refreshed for various refresh schemes
function _refreshHourly(now, refreshed) {
  return (now.getHours() != refreshed.getHours() ||
    now.getDay() != refreshed.getDay() ||
    now.getMonth() != refreshed.getMonth() ||
    now.getFullYear() != refreshed.getFullYear());
}
function _refreshDaily(now, refreshed) {
  return (now.getDay() != refreshed.getDay() ||
    now.getMonth() != refreshed.getMonth() ||
    now.getFullYear() != refreshed.getFullYear());
}
function _refreshMonthly(now, refreshed) {
  return (now.getMonth() != refreshed.getMonth() ||
    now.getFullYear() != refreshed.getFullYear());
}
function _refreshYearly(now, refreshed) {
  return (now.getFullYear() != refreshed.getFullYear());
}

/**
 * Checks if an actor owns a Budget.
 *
 * @param actor the actor to compare against.
 * @param budget the Budget to compare.
 * @param callback(err, owns) called once the operation completes.
 */
function _checkBudgetOwner(actor, budget, callback) {
  async.waterfall([
    function(callback) {
      if('owner' in budget) {
        callback(null, budget);
      }
      else {
        api.getBudget(actor, budget.id, function(err, budget) {
          callback(err, budget);
        });
      }
    },
    function(budget, callback) {
      payswarm.identity.checkIdentityObjectOwner(actor, budget, callback);
    }
  ], callback);
}

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    id: PERMISSIONS.BUDGET_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Budget Administration',
    comment: 'Required to administer Budgets.'
  }, {
    id: PERMISSIONS.BUDGET_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Budget',
    comment: 'Required to access a Budget.'
  }, {
    id: PERMISSIONS.BUDGET_CREATE,
    psaModule: MODULE_IRI,
    label: 'Create Budget',
    comment: 'Required to create a Budget.'
  }, {
    id: PERMISSIONS.BUDGET_EDIT,
    psaModule: MODULE_IRI,
    label: 'Edit Budget',
    comment: 'Required to edit a Budget.'
  }, {
    id: PERMISSIONS.BUDGET_REMOVE,
    psaModule: MODULE_IRI,
    label: 'Remove Budget',
    comment: 'Required to remove a Budget.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}

/**
 * Check if budget amount satisfies system limits.
 *
 * @param budget the Budget to check.
 * @param account the source account for this budget.
 * @param callback(err) the callback to call when done.
 */
function _checkLimits(budget, account, callback) {
  // check limits on exclusive amount
  var amount = payswarm.money.createMoney(budget.amount);
  var currency = account.currency;
  var cfg = payswarm.config.financial.budget;
  var min = cfg.limits[currency].minimum;
  var exclusiveMin = cfg.limits[currency].minimumExclusive;
  var amountCmpMin = amount.compareTo(min);
  if(amountCmpMin < 0 || (exclusiveMin && amountCmpMin === 0)) {
    var msg = exclusiveMin ?
      'Minimum budget amount must be greater than' :
      'Minimum budget amount is';
    return callback(new PaySwarmError(
      msg + ' $' + min + '.',
      MODULE_TYPE + '.InvalidBudget', {
        httpStatusCode: 400,
        'public': true
      }));
  }
  var max = cfg.limits[currency].maximum;
  if(amount.compareTo(max) > 0) {
    return callback(new PaySwarmError(
      'Maximum budget amount is $' + max + '.',
      MODULE_TYPE + '.InvalidBudget', {
        httpStatusCode: 400,
        'public': true
      }));
  }
  callback();
}

