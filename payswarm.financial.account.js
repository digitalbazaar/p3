/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission')
};

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
    function openCollections(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['account'], callback);
    },
    function setupCollections(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'account',
        fields: {id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function createAccounts(callback) {
      // create accounts, ignoring duplicate errors
      async.forEachSeries(
        payswarm.config.financial.accounts,
        function(a, callback) {
          _createAccount(a, function(err) {
            if(err && !payswarm.db.isDuplicateError(err)) {
              err = null;
            }
            callback(err);
          });
        },
        callback);
    }
  ], callback);
};

/**
 * Creates a new Account ID based on the owner's Identity ID and the given
 * name.
 *
 * @param ownerId the ID of the Identity account owner.
 * @param name the name of the account (slug).
 *
 * @return the AccountId for the Account.
 */
api.createAccountId = function(ownerId, name) {
  return util.format('%s/accounts/%s', ownerId, encodeURIComponent(name));
};

/**
 * Creates a new Account.
 *
 * The Account must contain @id and an owner.
 *
 * @param actor the Profile performing the action.
 * @param account the Account to create.
 * @param callback(err) called once the operation completes.
 */
api.createAccount = function(actor, account, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, account,
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_CREATE,
        _checkAccountOwner, callback);
    },
    function(callback) {
      _createAccount(account, callback);
    }
  ], callback);
};

/**
 * Retrieves all Accounts owned by a particular Identity.
 *
 * @param actor the Profile performing the action.
 * @param identityId the ID of the Identity to get the Accounts for.
 * @param callback(err, records) called once the operation completes.
 */
api.getIdentityAccounts = function(actor, identityId, callback) {
  async.waterfall([
    function(callback) {
      api.checkActorPermission(
        actor, PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_ACCESS,
        callback);
    },
    function(callback) {
      payswarm.db.collections.account.find(
        {owner: payswarm.db.hash(identityId)},
        payswarm.db.readOptions).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves all Accounts matching the given query.
 *
 * @param actor the Profile performing the action.
 * @param query the query to use (defaults to {}).
 * @param callback(err, records) called once the operation completes.
 */
api.getAccounts = function(actor, query, callback) {
  query = query || {};
  async.waterfall([
    function(callback) {
      api.checkActorPermission(actor, PERMISSIONS.ACCOUNT_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.account.find(
        query, payswarm.db.readOptions).toArray(callback);
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
        {id: payswarm.db.hash(id)},
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      callback(null, result.account, result.meta);
    },
    function(callback, account, meta) {
      api.checkActorPermissionForObject(
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
     api.checkActorPermissionForObject(
       actor, account,
       PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
       _checkAccountOwner, callback);
   },
   function(callback) {
     // remove restricted fields
     account = payswarm.tools.clone(account);
     delete account['ps:owner'];
     delete account['psa:status'];
     delete account['com:balance'];
     delete account['com:escrow'];
     delete account['com:currency'];
     payswarm.db.collections.account.update(
       {id: payswarm.db.hash(account['@id'])},
       {$set: payswarm.db.buildUpdate(account)},
       payswarm.db.writeOptions,
       callback);
   },
   function(n, callback) {
     if(n === 0) {
       callback(new payswarm.tools.PaySwarmError(
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
 * @param callback(err) called once the operation completes.
 */
function _createAccount(account, callback) {
  var defaults = payswarm.config.account.defaults;

  // force balances for new accounts to zero
  account['com:balance'] = '0.0000000';
  account['com:escrow'] = '0.0000000';

  // add account defaults
  account = payswarm.tools.extend(
    true, {}, defaults.account, account);

  // insert the account
  var now = +new Date();
  var record = {
    id: payswarm.db.hash(account['@id']),
    owner: payswarm.db.hash(account['ps:owner']),
    meta: {
      created: now,
      updated: now
    },
    account: account
  };
  payswarm.db.collections.account.insert(
    record, payswarm.db.writeOptions, callback);
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
      if('ps:owner' in account) {
        callback(null, account);
      }
      else {
        api.getAccount(actor, account['@id'], function(err, account) {
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
    '@id': PERMISSIONS.ACCOUNT_ADMIN,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Account Administration',
    'rdfs:comment': 'Required to administer Accounts.'
  }, {
    '@id': PERMISSIONS.ACCOUNT_ACCESS,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Access Account',
    'rdfs:comment': 'Required to access an Account.'
  }, {
    '@id': PERMISSIONS.ACCOUNT_CREATE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Create Account',
    'rdfs:comment': 'Required to create an Account.'
  }, {
    '@id': PERMISSIONS.ACCOUNT_EDIT,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Edit Account',
    'rdfs:comment': 'Required to edit an Account.'
  }, {
    '@id': PERMISSIONS.ACCOUNT_REMOVE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Remove Account',
    'rdfs:comment': 'Required to remove an Account.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
