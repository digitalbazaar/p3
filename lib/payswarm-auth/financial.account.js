/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  money: require('./money'),
  permission: require('./permission'),
  profile: require('./profile'),
  tools: require('./tools')
};
var util = require('util');
var PaySwarmError = payswarm.tools.PaySwarmError;
var Money = payswarm.money.Money;

// constants
var MODULE_TYPE = payswarm.financial.type;
var MODULE_IRI = payswarm.financial.iri;

// module permissions
var PERMISSIONS = {
  ACCOUNT_ADMIN: MODULE_IRI + '#account_admin',
  ACCOUNT_ACCESS: MODULE_IRI + '#account_access',
  ACCOUNT_CREATE: MODULE_IRI + '#account_create',
  ACCOUNT_EDIT: MODULE_IRI + '#account_edit',
  ACCOUNT_REMOVE: MODULE_IRI + '#account_remove'
};

// sub module API
var api = {};
module.exports = api;

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
      payswarm.db.openCollections(['account'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'account',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'account',
        fields: {owner: 1},
        options: {unique: false, background: true}
      }, {
        collection: 'account',
        fields: {creditUsed: 1, id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      // create accounts, ignoring duplicate errors
      async.forEachSeries(
        payswarm.config.financial.accounts,
        function(a, callback) {
          _createAccount(a, {}, function(err) {
            if(err && payswarm.db.isDuplicateError(err)) {
              err = null;
            }
            callback(err);
          });
        }, callback);
    }
  ], callback);
};

/**
 * Creates a new FinancialAccount ID based on the owner's Identity ID and the
 * given name.
 *
 * @param ownerId the ID of the Identity account owner.
 * @param name the name of the account (slug).
 *
 * @return the FinancialAccountId for the FinancialAccount.
 */
api.createAccountId = function(ownerId, name) {
  return util.format('%s/accounts/%s', ownerId, encodeURIComponent(name));
};

/**
 * Creates a new FinancialAccount.
 *
 * The FinancialAccount must contain id and an owner.
 *
 * @param actor the Profile performing the action.
 * @param account the FinancialAccount to create.
 * @param [options] the FinancialAccount options to use.
 *          [balance] a custom balance to use (must be enabled in config).
 * @param callback(err, record) called once the operation completes.
 */
api.createAccount = function(actor, account, options, callback) {
  if(typeof(options) === 'function') {
    callback = options;
    options = {};
  }
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, account,
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_CREATE,
        payswarm.identity.checkIdentityObjectOwner, callback);
    },
    function(callback) {
      _createAccount(account, options, callback);
    }
  ], callback);
};

/**
 * Retrieves all FinancialAccounts owned by a particular Identity.
 *
 * @param actor the Profile performing the action.
 * @param identityId the ID of the Identity to get the FinancialAccounts for.
 * @param callback(err, records) called once the operation completes.
 */
api.getIdentityAccounts = function(actor, identityId, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: identityId},
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_ACCESS,
        payswarm.identity.checkIdentityOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.account.find(
        {owner: payswarm.db.hash(identityId)}).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves all FinancialAccounts matching the given query.
 *
 * @param actor the Profile performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 */
api.getAccounts = function(actor, query, fields, options, callback) {
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
  else if(typeof options === 'function') {
    callback = options;
    options = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.ACCOUNT_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.account.find(
        query, fields, options).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves an Account.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to retrieve.
 * @param callback(err, account, meta) called once the operation completes.
 */
api.getAccount = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Account not found.',
          MODULE_TYPE + '.AccountNotFound',
          {id: id, httpStatusCode: 404, 'public': true}));
      }
      callback(null, record.account, record.meta);
    },
    function(account, meta, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, account,
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_ACCESS,
        _checkAccountOwner, function(err) {
          callback(err, account, meta);
        });
    }
  ], callback);
};

/**
 * Updates an existing Account.
 *
 * @param actor the Profile performing the action.
 * @param account the Account to update.
 * @param callback(err) called once the operation completes.
 */
api.updateAccount = function(actor, account, callback) {
 async.waterfall([
   function(callback) {
     payswarm.profile.checkActorPermissionForObject(
       actor, account,
       PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
       _checkAccountOwner, callback);
   },
   function(callback) {
     // exclude restricted fields
     payswarm.db.collections.account.update(
       {id: payswarm.db.hash(account.id)},
       {$set: payswarm.db.buildUpdate(
         account, 'account', {exclude: [
           'account.owner', 'account.psaStatus',
           'account.balance', 'account.currency']})},
       payswarm.db.writeOptions,
       callback);
   },
   function(n, info, callback) {
     if(n === 0) {
       callback(new PaySwarmError(
         'Could not update Account. Account not found.',
         MODULE_TYPE + '.AccountNotFound'));
     }
     else {
       callback();
     }
   }
 ], callback);
};

/**
 * Creates a new Financial Account, inserting it into the database.
 *
 * @param account the Account to create.
 * @param options the account options to use.
 *          [balance] a custom balance to use (must be enabled in config).
 * @param callback(err, record) called once the operation completes.
 */
function _createAccount(account, options, callback) {
  // seed account options with defaults
  var defaults = payswarm.config.financial.defaults;
  account = payswarm.tools.extend(true, {}, defaults.account, options, account);
  payswarm.logger.debug('creating account', account);

  // allow initial balance if configured
  var balance = null;
  if(payswarm.config.financial.allowInitialBalance) {
    balance = new Money(account.balance || 0);
    // validate balance
    if(balance.isNegative()) {
      return callback(new PaySwarmError(
        'Initial account balance must be non-negative.',
        MODULE_TYPE + '.InvalidConfig',
        {balance: balance.toString()}));
    }
  }

  // force balance to zero
  account.balance = new Money(0).toString();

  // force credit limit to zero
  account.creditLimit = new Money(0).toString();

  async.waterfall([
    function(callback) {
      // insert the account
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(account.id),
        owner: payswarm.db.hash(account.owner),
        incoming: {},
        outgoing: {},
        updateId: 0,
        meta: {
          created: now,
          updated: now
        },
        account: account
      };
      payswarm.db.collections.account.insert(
        record, payswarm.db.writeOptions, function(err, records) {
          if(err) {
            return callback(err);
          }
          callback(null, records[0]);
        });
    },
    function(record, callback) {
      if(!balance || balance.isZero()) {
        return callback(null, record);
      }
      // if positive default balance, add a deposit
      // (used for demonstration purposes)
      async.waterfall([
        function(callback) {
          var deposit = {
            '@context': 'https://w3id.org/payswarm/v1',
            type: ['Transaction', 'Deposit'],
            payee: [{
              type: 'Payee',
              payeeGroup: ['deposit'],
              payeeRate: balance.toString(),
              payeeRateType: 'FlatAmount',
              payeeApplyType: 'ApplyExclusively',
              destination: record.account.id,
              currency: 'USD',
              comment: 'Default demo deposit.'
            }],
            source: payswarm.config.financial.devPaymentToken
          };
          payswarm.financial.signDeposit(null, deposit, callback);
        },
        function(deposit, callback) {
          payswarm.financial.processDeposit(null, deposit, callback);
        }
      ], function(err, deposit) {
        callback(err, record);
      });
    }
  ], callback);
}

/**
 * Checks if an actor owns an Account.
 *
 * @param actor the actor to compare against.
 * @param account the Account to compare.
 * @param callback(err, owns) called once the operation completes.
 */
function _checkAccountOwner(actor, account, callback) {
  async.waterfall([
    function(callback) {
      if('owner' in account) {
        callback(null, account);
      }
      else {
        api.getAccount(actor, account.id, function(err, account) {
          callback(err, account);
        });
      }
    },
    function(account, callback) {
      payswarm.identity.checkIdentityObjectOwner(actor, account, callback);
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
    id: PERMISSIONS.ACCOUNT_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Account Administration',
    comment: 'Required to administer Accounts.'
  }, {
    id: PERMISSIONS.ACCOUNT_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Account',
    comment: 'Required to access an Account.'
  }, {
    id: PERMISSIONS.ACCOUNT_CREATE,
    psaModule: MODULE_IRI,
    label: 'Create Account',
    comment: 'Required to create an Account.'
  }, {
    id: PERMISSIONS.ACCOUNT_EDIT,
    psaModule: MODULE_IRI,
    label: 'Edit Account',
    comment: 'Required to edit an Account.'
  }, {
    id: PERMISSIONS.ACCOUNT_REMOVE,
    psaModule: MODULE_IRI,
    label: 'Remove Account',
    comment: 'Required to remove an Account.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
