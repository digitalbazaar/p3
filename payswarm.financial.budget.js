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
var Money = money: require('./payswarm.money');

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
        fields: {id: 1, vendors: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function getIdGenerator(callback) {
      payswarm.db.getDistributedIdGenerator('budget',
        function(err, idGenerator) {
          if(!err) {
            budgetIdGenerator = idGenerator
          }
          callback(err);
      });
    }
  ], callback);
};

/**
 * Creates a Budget ID from the given Identity ID and budget slug.
 *
 * @param ownerId the Identity ID.
 * @param name the short budget name (slug).
 *
 * @return the Budget ID.
 */
api.createBudgetId = function(ownerId, name) {
  return util.format('%s/budgets/%s', ownerId, encodeURIComponent(name));
};

/**
 * Creates a new BudgetId based on the owner's IdentityId.
 *
 * @param ownerId the ID of the Identity that owns the budget.
 * @param callback(err, id) called once the operation completes.
 */
api.generateBudgetId(ownerId, callback) {
  budgetIdGenerator.generateId(callback);
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
      // initialize any unset budget parameters
      _initBudget(budget);

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
 * Populates Budgets based on the given query. The query may contain
 * "budget" or "identity" (and "vendor" optionally along with "identity"),
 * where these fields refer to the ID of a specific budget, the ID of an
 * identity, and the ID of a vendor, respectively.
 *
 * @param actor the profile performing the action.
 * @param query the query to use.
 * @param result the result set with Budgets.
 * @param meta to store the meta data for the Budgets.
 *
 * @return true on success, false on failure with exception set.
 */
api.populateBudgets = function(actor, query, callback) {
  bool rval;

  // initialize result
  result->setType(Map);
  result->clear();
  result["resources"]->setType(Array);

  // initialize meta
  if(meta != NULL)
  {
     (*meta)->setType(Array);
     (*meta)->clear();
  }

  // look up specific budget
  if(query->hasMember("budget"))
  {
     Budget budget;
     DynamicObject budgetMeta;
     budget["@id"] = query["budget"].clone();
     rval = mBudgetStorage->get(
        budget, NULL, NULL, PS_DYNO_STORAGE_DEFAULT_INDEX, &budgetMeta);
     if(rval)
     {
        // check budget permissions
        CompareIdentityObjectOwner c(mIdentityApi);
        rval = mProfileApi->checkActorPermissionForObject(
           actor, budget, PERMISSION_BUDGET_ADMIN, PERMISSION_BUDGET_ACCESS,
           &c);
        if(rval)
        {
           result["resources"]->append(budget);
           result["total"] = 1;
           result["start"] = 0;
           result["num"] = 1;
           if(meta != NULL)
           {
              (*meta)->append(budgetMeta);
           }
        }
     }
  }
  // look up budgets owned by an identity
  else if(query->hasMember("identity"))
  {
     // populate identity
     Identity identity;
     identity["@id"] = query["identity"].clone();
     DynamicObject identityMeta;
     DynamicObject vendorMeta(NULL);
     rval = mIdentityApi->getIdentity(actor, identity, &identityMeta);
     if(rval)
     {
        // no vendor, use DynoStorage API to get all owned budgets
        if(!query->hasMember("vendor"))
        {
           // get the budgets owned by the given identity
           DynoStorageRef storage;
           DynamicObject where;
           where[0]["ps:owner"] = identity["@id"];
           rval =
              mBudgetStorage->getMany(result, &where, NULL, 0, 0, NULL, meta);
        }
        // get specific budget for a vendor
        else
        {
           // look up vendor identity meta
           Identity vendor;
           vendor["@id"] = query["vendor"].clone();
           vendorMeta = DynamicObject();
           Profile authority;
           authority["@id"] = mProfileConfig["authority"];
           rval = mIdentityApi->getIdentity(authority, vendor, &vendorMeta);

           // query index
           if(rval)
           {
              // TODO: allow query to specify limit info
              DynamicObject where;
              where["identityIdxKey"] = identityMeta["indexKey"];
              if(!vendorMeta.isNull())
              {
                 where["vendorIdxKey"] = vendorMeta["indexKey"];
              }
              DynamicObject members;
              members["budgetIdxKey"];
              SqlExecutableRef se = mDatabaseClient->selectOne(
                 mDbApi->getGlobalTableName(TABLE_BUDGET_VENDOR_IDX),
                 &where, &members);
              rval = !se.isNull() && mDatabaseClient->execute(se);
              if(rval)
              {
                 // populate result
                 result["total"] = se->rowsRetrieved;
                 result["start"] = 0;
                 result["num"] = se->rowsRetrieved;
                 if(se->rowsRetrieved > 0)
                 {
                    Budget& budget = result["resources"]->append();
                    uint64_t indexKey = se->result["budgetIdxKey"];
                    DynamicObject m;
                    if(meta != NULL)
                    {
                       (*meta)->append(m);
                    }
                    rval = mBudgetStorage->get(
                       budget, NULL, NULL, PS_DYNO_STORAGE_DEFAULT_INDEX, &m,
                       &indexKey);
                 }
              }
           }
        }
     }
  }
  // missing "budget" or "identity" in query, so invalid
  else
  {
     ExceptionRef e = new Exception(
        "Invalid budget query. The query must contain 'budget' or "
        "'identity'.",
        PS_FINANCIAL ".InvalidQuery");
     Exception::set(e);
     rval = false;
  }

  if(rval)
  {
     Date now;
     uint32_t secs = Date::utcSeconds();
     DynamicObjectIterator bi = result["resources"].getIterator();
     DynamicObjectIterator mi;
     if(meta != NULL)
     {
        mi = (*meta).getIterator();
     }
     while(rval && bi->hasNext())
     {
        Budget& budget = bi->next();
        if(meta != NULL)
        {
           mi->next();
        }

        // remove budget if expired
        if(budget["psa:expires"]->getUInt32() <= secs)
        {
           rval = removeBudget(actor, budget["@id"]);
           bi->remove();
           if(meta != NULL)
           {
              mi->remove();
           }
           result["total"] = result["total"]->getUInt64() - 1;
           result["num"] = result["num"]->getUInt64() - 1;
        }
        // refresh budget if necessary
        else if(_mustRefresh(budget, now))
        {
           budget["psa:refreshed"] = secs;
           budget["com:balance"] = budget["com:amount"].clone();

           BudgetUpdater updater;
           updater.changes = budget.clone();
           updater.refresh = true;
           rval = DatabaseUpdate<BudgetUpdater>().run(
              mBudgetStorage, &updater, budget);
        }
     }
  }

  return rval;
};

/**
 * Updates an existing Budget. Use this method to change the Budget
 * parameters, do not use it to change the Budget's remaining balance or
 * its applicable vendors. Other than @id only updated fields need to
 * be included.
 *
 * @param actor the Profile performing the action.
 * @param budgetUpdate the budget with @id and fields to update.
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
 * @param actor the profile performing the action.
 * @param id the ID of the budget to update.
 * @param amount the Money amount to change the Budget balance by (+/-).
 * @param callback(err) called once the operation completes.
 */
api.updateBudgetBalance = function(actor, id, amount, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermissionForObject(
        actor, {'@id': id},
        PERMISSIONS.BUDGET_ADMIN, PERMISSIONS.BUDGET_EDIT,
        _checkBudgetOwner, callback);
    },
    function(callback) {
      var done = false;
      async.until(function() {return done;}, function(callback) {
        _updateBalance(id, amount, function(err, updated) {
          done = updated;
          callback(err);
        });
      }, callback);
    }
  ], callback);
};

/**
 * Adds a vendor to a Budget.
 *
 * @param actor the profile performing the action.
 * @param budgetId the ID of the budget.
 * @param vendorId the ID of the vendor to add.
 *
 * @return true on success, false on failure with exception set.
 */
api.addBudgetVendor(actor, budgetId, vendorId, callback) {
  bool rval;

  // get the budget
  Budget budget;
  budget["@id"] = budgetId;
  rval = mBudgetStorage->get(budget);

  // check permissions
  CompareIdentityObjectOwner c(mIdentityApi);
  rval = rval && mProfileApi->checkActorPermissionForObject(
     actor, budget, PERMISSION_BUDGET_ADMIN, PERMISSION_BUDGET_EDIT, &c);
  if(rval)
  {
     BudgetVendorUpdater updater;
     updater.budgetId = budgetId;
     updater.vendorId = vendorId;
     updater.add = true;

     // look up identity and vendor meta data
     Identity identity;
     identity["@id"] = budget["ps:owner"].clone();
     DynamicObject identityMeta;
     rval = mIdentityApi->getIdentity(actor, identity, &identityMeta);
     if(rval)
     {
        Profile authority;
        authority["@id"] = mProfileConfig["authority"];
        Identity vendor;
        vendor["@id"] = vendorId;
        DynamicObject vendorMeta;
        rval = mIdentityApi->getIdentity(authority, vendor, &vendorMeta);
        if(rval)
        {
           updater.identityIdxKey = identityMeta["indexKey"];
           updater.vendorIdxKey = vendorMeta["indexKey"];
        }
     }

     rval = rval && AtomicDatabaseUpdate<BudgetVendorUpdater>().run(
        mDbApi, mDatabaseClient, &updater);
  }

  return rval;
};

/**
 * Removes a vendor from a Budget.
 *
 * @param actor the profile performing the action.
 * @param budgetId the ID of the budget.
 * @param vendorId the ID of the vendor to remove.
 *
 * @return true on success, false on failure with exception set.
 */
api.removeBudgetVendor = function(actor, budgetId, vendorId, callback) {
  bool rval;

  // get the budget
  Budget budget;
  budget["@id"] = budgetId;
  rval = mBudgetStorage->get(budget);

  // check permissions
  CompareIdentityObjectOwner c(mIdentityApi);
  rval = rval && mProfileApi->checkActorPermissionForObject(
     actor, budget, PERMISSION_BUDGET_ADMIN, PERMISSION_BUDGET_EDIT, &c);
  if(rval)
  {
     BudgetVendorUpdater updater;
     updater.budgetId = budgetId;
     updater.vendorId = vendorId;
     updater.add = false;

     // look up identity and vendor meta data
     Identity identity;
     identity["@id"] = budget["ps:owner"].clone();
     DynamicObject identityMeta;
     rval = mIdentityApi->getIdentity(actor, identity, &identityMeta);
     if(rval)
     {
        Profile authority;
        authority["@id"] = mProfileConfig["authority"];
        Identity vendor;
        vendor["@id"] = vendorId;
        DynamicObject vendorMeta;
        rval = mIdentityApi->getIdentity(authority, vendor, &vendorMeta);
        if(rval)
        {
           updater.identityIdxKey = identityMeta["indexKey"];
           updater.vendorIdxKey = vendorMeta["indexKey"];
        }
     }

     rval = rval && AtomicDatabaseUpdate<BudgetVendorUpdater>().run(
        mDbApi, mDatabaseClient, &updater);
  }

  return rval;
};

function _initBudget(Budget& budget) {
   JsonLd::addValue(budget, "@type", "psa:Budget");

   // set balance if not set
   if(!budget->hasMember("com:balance"))
   {
      budget["com:balance"] = budget["com:amount"].clone();
   }

   // ensure balance is not greater than amount
   Money balance = budget["com:balance"];
   Money amount = budget["com:amount"];
   if(balance > amount)
   {
      budget["com:balance"] = budget["com:amount"].clone();
   }

   // set max per use to amount if not set
   if(!budget->hasMember("psa:maxPerUse"))
   {
      budget["psa:maxPerUse"] = budget["com:amount"].clone();
   }

   // set refreshed to now if not set
   if(budget->hasMember("psa:refreshed"))
   {
      // coerce to an Int32
      budget["psa:refreshed"]->setType(UInt32);
   }
   else
   {
      // use current time
      budget["psa:refreshed"] = (uint32_t)Date::utcSeconds();
   }

   // set refresh to never if not set
   if(!budget->hasMember("psa:refresh"))
   {
      budget["psa:refresh"] = "psa:Never";
   }

   // coerce to an Int32
   if(budget->hasMember("psa:expires"))
   {
      uint32_t e = budget["psa:expires"]->getUInt32();
      // relative expires if < ~13 months
      if(e <= ((365 + 30) * 24 * 60 * 60))
      {
         e += (uint32_t)Date::utcSeconds();
      }
      budget["psa:expires"] = e;
   }
   // set expiration to forever if not set
   else
   {
      budget["psa:expires"] = UINT32_MAX;
   }
}

/**
 * A helper function called internally to update a Budget balance.
 *
 * @param id the ID of the Budget.
 * @param amount the Money amount to change the balance by.
 * @param callback(err, updated) called once the operation completes.
 */
function _updateBalance(id, amount, callback) {
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

      // update balance by amount
      var balance = new Money(result.balance);
      balance.add(amount);

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
      balance = balance.toString();
      payswarm.db.collections.budget.update(
        {id: payswarm.db.hash(id), updateCounter: result.updateCounter + 1},
        {$set: {'budget.com:balance': balance}, $inc: {updateCounter: 1}},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, callback) {
      // budget updated if record was affected
      updated = (n === 1);
    }
  ], function(err) {
    callback(err, done);
  });
}

function _refreshHourly(Date& now, Date& refreshed) {
   return (now.hour() != refreshed.hour() ||
      now.day() != refreshed.day() ||
      now.month() != refreshed.month() ||
      now.year() != refreshed.year());
}

function _refreshDaily(Date& now, Date& refreshed) {
   return (now.day() != refreshed.day() ||
      now.month() != refreshed.month() ||
      now.year() != refreshed.year());
}

function _refreshMonthly(Date& now, Date& refreshed) {
   return (now.month() != refreshed.month() ||
      now.year() != refreshed.year());
}

function _refreshYearly(Date& now, Date& refreshed) {
   return (now.year() != refreshed.year());
}

function _mustRefresh(Budget& budget, Date& now) {
   bool rval = false;

   // FIXME: decide if @ids used for refresh or something else
   if(budget["psa:refresh"] != "psa:Never")
   {
      Date refreshed(budget["psa:refreshed"]->getUInt32());
      if(now.getSeconds() > refreshed.getSeconds())
      {
         rval = (
            (budget["psa:refresh"] == "psa:Hourly" &&
            _refreshHourly(now, refreshed)) ||
            (budget["psa:refresh"] == "psa:Daily" &&
            _refreshDaily(now, refreshed)) ||
            (budget["psa:refresh"] == "psa:Monthly" &&
            _refreshMonthly(now, refreshed)) ||
            (budget["psa:refresh"] == "psa:Yearly" &&
            _refreshYearly(now, refreshed))
         );
      }
   }

   return rval;
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
