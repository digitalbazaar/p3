/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security')
};
var Money = require('./payswarm.money').Money;

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
    function openCollections(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['budget'], callback);
    },
    function setupCollections(callback) {
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
    function getIdGenerator(callback) {
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
 * Creates a new Budget. The "@id", "@type", "ps:owner", and
 * "com:amount" properties must be set.
 *
 * @param actor the Profile performing the action.
 * @param budget the new Budget to create.
 * @param callback(err) called once the operation completes.
 */
api.createBudget = function(actor, budget, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, budget,
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_CREATE,
        payswarm.identity.checkIdentityObjectOwner, callback);
    },
    function(callback) {
      // sanitize budget
      _sanitizeBudget(budget, false);

      // clear vendor field
      budget['com:vendor'] = [];

      // insert budget
      var record = {
        id: payswarm.db.hash(budget['@id']),
        owner: payswarm.db.hash(budget['ps:owner']),
        vendors: [],
        updateCounter: 0,
        meta: {
          created: now,
          updated: now
        },
        budget: budget
      };
      payswarm.db.collections.budget.insert(
        record, payswarm.db.writeOptions, callback);
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
        {id: payswarm.db.hash(id)},
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        return callback(new payswarm.tools.PaySwarmError(
          'Budget not found.',
          MODULE_TYPE + '.BudgetNotFound',
          {'@id': id}));
      }
      callback(null, result.budget, result.meta);
    },
    function(budget, meta, callback) {
      api.checkActorPermissionForObject(
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
            return callback(new payswarm.tools.PaySwarmError(
              'Budget not found.',
              MODULE_TYPE + '.BudgetNotFound',
              {'@id': id}));
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
  if(arguments.length() === 3) {
    callback = arguments[2];
  }
  else {
    vendorId = arguments[2];
    callback = arguments[3];
  }

  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, {'ps:owner': identityId},
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_ACCESS,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      var query = {owner: payswarm.db.hash(identityId)};
      if(vendorId) {
        query.vendors = payswarm.db.hash(vendorId);
      }
      payswarm.db.collections.budget.find(
        query, payswarm.db.readOptions).toArray(callback);
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
 * @param query the query to use (defaults to {}).
 * @param result the result set with Budgets.
 * @param meta to store the meta data for the Budgets.
 *
 * @return true on success, false on failure with exception set.
 */
api.getBudgets = function(actor, query, callback) {
  query = query || {};
  async.waterfall([
    function(callback) {
      api.checkActorPermission(actor, PERMISSIONS.BUDGET_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.budget.find(
        query, payswarm.db.readOptions).toArray(callback);
    },
    _updateBudgets
  ], callback);
};

/**
 * Updates an existing Budget. Use this method to change the Budget
 * parameters, do not use it to change the Budget's remaining balance or
 * its applicable vendors. Other than @id only updated fields need to
 * be included.
 *
 * @param actor the Profile performing the action.
 * @param budgetUpdate the Budget with @id and fields to update.
 * @param callback(err) called once the operation completes.
 */
api.updateBudget = function(actor, budgetUpdate, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermissionForObject(
        actor, {'@id': budgetUpdate['@id']},
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      // remove restricted fields
      budgetUpdate = payswarm.tools.clone(budgetUpdate);
      delete budgetUpdate['com:balance'];
      delete budgetUpdate['ps:owner'];
      delete budgetUpdate['com:vendor'];
      _sanitizeBudget(budgetUpdate, true);
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(budgetUpdate['@id'])},
        {$set: payswarm.db.buildUpdate(budgetUpdate)},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, callback) {
      if(n === 0) {
        callback(new payswarm.tools.PaySwarmError(
          'Could not update Budget. Budget not found.',
          MODULE_TYPE + '.BudgetNotFound'));
      }
      else {
        callback();
      }
    }
  ], callback);
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
      api.checkActorPermission(
        actor, {'@id': id},
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
      api.checkActorPermissionForObject(
        actor, {'@id': id},
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
      api.getBudget(actor, budgetId, callback);
    },
    function(budget, callback) {
      api.checkActorPermissionForObject(
        actor, budget,
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      // remove vendor from any other owned budget
      payswarm.db.collections.budget.update(
        {owner: payswarm.db.hash(budget['ps:owner']), vendors: vendorHash},
        {$pull: {vendors: vendorHash, 'budget.com:vendor': vendorId}},
        payswarm.db.writeOptions,
        callback);
    },
    function(callback) {
      // add vendor to budget
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(budgetId)},
        {$addToSet: {vendors: vendorHash, 'budget.com:vendor': vendorId}},
        payswarm.db.writeOptions,
        callback);
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
      api.getBudget(actor, budgetId, callback);
    },
    function(budget, callback) {
      api.checkActorPermissionForObject(
        actor, budget,
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      // remove vendor from budget
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(budgetId)},
        {$pull: {vendors: vendorHash, 'budget.com:vendor': vendorId}},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Sanitizes a Budget by adding any missing fields, etc.
 *
 * @param budget the Budget to sanitize.
 * @param update true if the sanitation is only for an update.
 */
function _sanitizeBudget(budget, update) {
  if(!update) {
    // FIXME: use JSON-LD helper function once in jsonld.js
    //JsonLd::addValue(budget, '@type', 'psa:Budget');
    budget['@type'] = 'psa:Budget';

    // set balance if not set
    budget['com:balance'] = budget['com:balance'] || budget['com:amount'];

    // ensure balance is not greater than amount
    var balance = new Money(budget['com:balance']);
    var amount = new Money(budget['com:amount']);
    if(balance.compareTo(amount) > 0) {
      budget['com:balance'] = budget['com:amount'];
    }

    // set max per use to amount if not set
    budget['psa:maxPerUse'] = budget['psa:maxPerUse'] || budget['com:amount'];

    // set refresh to never if not set
    budget['psa:refresh'] = budget['psa:refresh'] || 'psa:Never';
  }

  // set refreshed to now if not set
  if('psa:refreshed' in budget) {
    // coerce to an integer
    budget['psa:refreshed'] = parseInt(budget['psa:refreshed']);
  }
  else if(!update) {
    // use current time
    budget['psa:refreshed'] = Math.floor(+new Date()/1000);
  }

  // coerce to an integer
  if('psa:expires' in budget) {
    var i = parseInt(budget['psa:expires']);

    // relative expires if < ~13 months
    if(i <= ((365 + 30) * 24 * 60 * 60)) {
      i += Math.floor(+new Date()/1000);
    }
    budget['psa:expires'] = i;
  }
  // set expiration to forever if not set
  else if(!update) {
    budget['psa:expires'] = 0xffffffff;
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
    if(budget['psa:expires'] <= secs) {
      return payswarm.db.collections.budget.remove(
        {id: payswarm.db.hash(budget['@id'])},
        payswarm.db.writeOptions, callback);
    }

    // budget not expiring
    budgets.push(record);

    // refresh budget if necessary
    if(_mustRefresh(budget, now)) {
      _atomicUpdateBalance(id, now, function(err) {
        if(!err) {
          budget['psa:refreshed'] = Math.floor(+now/1000);
          budget['com:balance'] = budget['com:amount'];
        }
        callback(err);
      });
    }
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
        {id: payswarm.db.hash(id)},
        ['updateCounter', 'budget.com:amount', 'budget.com:balance',
         'budget.psa:maxPerUse'],
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      // ensure amount is not greater than maxPerUse restriction
      var maxPerUse = new Money(result['psa:maxPerUse']);
      if(amount.compareTo(maxPerUse) > 0) {
        return callback(new payswarm.tools.PaySwarmError(
          'Could not update budget balance by the specified amount. ' +
          'The budget restricts the maximum amount that can be deducted ' +
          'from its balance in a single use.',
          MODULE_TYPE + '.BudgetRestriction',
          {budget: id, httpStatusCode: 400, 'public': true}));
      }

      // get next update counter
      var updateCounter = 0;
      if(result.updateCounter < 0xffffffff) {
        updateCounter = result.updateCounter + 1;
      }

      // update object
      var update = {$set: {updateCounter: updateCounter}};

      // update balance
      var balance = new Money(result['com:balance']);
      if(amountOrDate instanceof Date) {
        // refresh balance
        balance = new Money(result['com:amount']);
        update.$set['budget.com:psa:refreshed'] =
          Math.floor(+amountOrDate/1000);
      }
      else {
        // add amount
        balance.add(amountOrDate);
      }

      // check if over budget
      if(balance.isNegative()) {
        return callback(new payswarm.tools.PaySwarmError(
          'Could not update budget balance by the specified amount. ' +
          'The budget would be exceeded.',
          MODULE_TYPE + '.BudgetExceeded',
          {budget: id, httpStatusCode: 400, 'public': true}));
      }

      // cap balance at maximum amount for budget
      var max = new Money(budget['com:amount']);
      if(balance.compareTo(max) >= 0) {
        balance = max;
      }

      // attempt to update balance (ensure updateCounter matches)
      update.$set['budget.com:balance'] = balance.toString();
      balance = balance.toString();
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(id), updateCounter: result.updateCounter},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, callback) {
      // budget updated if record was affected
      updated = (n === 1);
    }
  ], function(err) {
    callback(err, done);
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

  // FIXME: decide if @ids used for refresh or something else
  if(budget['psa:refresh'] !== 'psa:Never') {
    var refreshed = new Date(budget['psa:refreshed'] * 1000);
    if(now.getSeconds() > refreshed.getSeconds()) {
      rval = (
        (budget['psa:refresh'] === 'psa:Hourly' &&
        _refreshHourly(now, refreshed)) ||
        (budget['psa:refresh'] === 'psa:Daily' &&
        _refreshDaily(now, refreshed)) ||
        (budget['psa:refresh'] === 'psa:Monthly' &&
        _refreshMonthly(now, refreshed)) ||
        (budget['psa:refresh'] === 'psa:Yearly' &&
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
      if('ps:owner' in budget) {
        callback(null, budget);
      }
      else {
        api.getBudget(actor, budget['@id'], function(err, budget) {
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
    '@id': PERMISSIONS.BUDGET_ADMIN,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Budget Administration',
    'rdfs:comment': 'Required to administer Budgets.'
  }, {
    '@id': PERMISSIONS.BUDGET_ACCESS,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Access Budget',
    'rdfs:comment': 'Required to access a Budget.'
  }, {
    '@id': PERMISSIONS.BUDGET_CREATE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Create Budget',
    'rdfs:comment': 'Required to create a Budget.'
  }, {
    '@id': PERMISSIONS.BUDGET_EDIT,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Edit Budget',
    'rdfs:comment': 'Required to edit a Budget.'
  }, {
    '@id': PERMISSIONS.BUDGET_REMOVE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Remove Budget',
    'rdfs:comment': 'Required to remove a Budget.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
