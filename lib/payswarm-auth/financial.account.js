/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld'); // use locally-configured jsonld
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
          MODULE_TYPE + '.FinancialAccountNotFound',
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
 * Updates an existing Account. This method cannot be used to alter several
 * important properties of an Account such as its owner, balance, creditLimit,
 * etc.
 *
 * @param actor the Profile performing the action.
 * @param account the Account with ID and fields to update.
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
            'account.balance', 'account.currency',
            'account.creditLimit', 'account.creditUsed',
            'account.psaDisableCredit', 'account.backupSource']})},
        payswarm.db.writeOptions,
        callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        return callback(new PaySwarmError(
          'Could not update Account. Account not found.',
          MODULE_TYPE + '.FinancialAccountNotFound',
          {id: account.id, httpStatusCode: 404, 'public': true}));
      }
      callback();
    }
  ], callback);
};

/**
 * Updates the credit limit for a Financial Account.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to update.
 * @param options the options to use.
 *          amount the Money amount to change the credit limit by (negative to
 *            decrease the credit limit).
 *          [backupSource] an optional backup source to add to the Account.
 * @param callback(err) called once the operation completes.
 */
api.updateAccountCreditLimit = function(actor, id, options, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
        _checkAccountOwner, callback);
    },
    function(callback) {
      _updateCreditLimit(id, options, callback);
    },
    function(callback) {
      if(!options.backupSource) {
        return callback();
      }
      api.addAccountBackupSource(actor, id, options.backupSource, callback);
    }
  ], callback);
};

/**
 * Updates the snapshot of a Financial Account's balance that is used to
 * manage the account's credit line and deposits. This method should only
 * be called just prior to the creation of a deposit in order to determine
 * its maximum amount.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to update.
 * @param callback(err, balance) called once the operation completes.
 */
api.updateAccountBalanceSnapshot = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
        _checkAccountOwner, callback);
    },
    function(callback) {
      _updateBalanceSnapshot(id, callback);
    }
  ], callback);
};

/**
 * Adds a backup source to a Financial Account. The backup source will be
 * added to the end of the ordered list of backup sources.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to update.
 * @param backupSourceId the ID of the backup source to add to the Account.
 * @param callback(err) called once the operation completes.
 */
api.addAccountBackupSource = function(actor, id, backupSourceId, callback) {
  async.auto({
    checkPermission: function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
        _checkAccountOwner, callback);
    },
    getToken: ['checkPermission', function(callback) {
      // TODO: support more than payment tokens as backup sources

      // get backup source
      payswarm.financial.getPaymentToken(
        actor, backupSourceId, function(err, paymentToken) {
          callback(err, paymentToken);
        });
    }],
    getAccount: ['checkPermission', function(callback, results) {
      api.getAccount(actor, id, function(err, account) {
        callback(err, account);
      });
    }],
    checkToken: ['getAccount', function(callback, results) {
      var paymentToken = results.getToken;

      // payment token owner must be same as account owner
      if(paymentToken.owner !== results.getAccount.owner) {
        return callback(new PaySwarmError(
          'Backup source and FinancialAccount owner must be the same entity.',
          MODULE_TYPE + '.InvalidOwner', {
            account: id,
            backupSource: backupSourceId,
            httpStatusCode: 400,
            'public': true
          }));
      }

      // payment token status must be active
      if(paymentToken.psaStatus !== 'active') {
        return callback(new PaySwarmError(
          'Backup source status must be active.',
          MODULE_TYPE + '.InvalidBackupSource', {
            backupSource: backupSourceId,
            httpStatusCode: 400,
            'public': true
          }));
      }

      // TODO: support other "instant" payment token types, add a property
      // for checking for "instant" support
      if(!jsonld.hasValue(paymentToken, 'paymentMethod', 'CreditCard')) {
        return callback(new PaySwarmError(
          'Backup source does not support instant funding. It must be, for ' +
          'example, a credit card.', MODULE_TYPE + '.InvalidBackupSource', {
            backupSource: backupSourceId,
            httpStatusCode: 400,
            'public': true
          }));
      }

      // TODO: support common expires

      // get expiration (do not add if in final hour or less)
      var ccard = paymentToken;
      var expires = new Date(ccard.cardExpYear, ccard.cardExpMonth + 1);
      expires.setTime(expires.getTime() - 1000*60*60);
      var now = new Date();
      if(now >= expires) {
        return callback(new PaySwarmError(
          'Backup source is expiring imminently or has already expired.',
          MODULE_TYPE + '.InvalidBackupSource', {
            backupSource: backupSourceId,
            httpStatusCode: 400,
            'public': true
          }));
      }
    }],
    updateAccount: ['checkToken', function(callback) {
      // add backup source to account
      // (do not use $addToSet, order not guaranteed)
      payswarm.db.collections.account.update({
        id: payswarm.db.hash(id),
        'account.backupSource': {$nin: [backupSourceId]}
      }, {$push: {'account.backupSource': backupSourceId}},
      payswarm.db.writeOptions, function(err) {
        callback(err);
      });
    }],
    updateToken: ['updateAccount', function(callback) {
      // add account to backup source
      // (do not use $addToSet, order not guaranteed)
      payswarm.db.collections.paymentToken.update({
        id: payswarm.db.hash(backupSourceId),
        'paymentToken.psaStatus': 'active',
        'paymentToken.backupSourceFor': {$nin: [id]}
      }, {$push: {'paymentToken.backupSourceFor': id}},
      payswarm.db.writeOptions, function(err) {
        callback(err);
      });
    }],
    checkBackupSources: ['updateToken', function(callback) {
      _checkBackupSources(id, callback);
    }],
    finish: ['checkBackupSources', function(callback, results) {
      var sources = results.checkBackupSources;
      if(sources.indexOf(backupSourceId) === -1) {
        return callback(new PaySwarmError(
          'Backup source not found or invalid.',
          MODULE_TYPE + '.InvalidBackupSource', {
            account: id,
            backupSource: backupSourceId,
            httpStatusCode: 404,
            'public': true
          }));
      }
      callback();
    }]
  }, function(err) {
    if(err) {
      return callback(new PaySwarmError(
        'Could not add backup source to FinancialAccount.',
        MODULE_TYPE + '.AddBackupSourceError', {
          account: id,
          backupSource: backupSourceId,
          'public': true
        }, err));
    }
    callback();
  });
};

/**
 * Removes a backup source from a Financial Account. The backup source can
 * only be removed if there is another available backup source or if the credit
 * limit is 0.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to update.
 * @param backupSourceId the ID of the backup source to remove.
 * @param callback(err) called once the operation completes.
 */
api.removeAccountBackupSource = function(actor, id, backupSourceId, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
        _checkAccountOwner, callback);
    },
    function(callback) {
      _checkBackupSources(id, {remove: backupSourceId}, callback);
    },
    function(sources, callback) {
      // remove account from backup source
      payswarm.db.collections.paymentToken.update({
        id: payswarm.db.hash(backupSourceId),
        'paymentToken.backupSourceFor': {$nin: [id]}
      }, {$pull: {'paymentToken.backupSourceFor': id}},
      payswarm.db.writeOptions, function(err) {
        callback(err);
      });
    }
  ], function(err) {
    if(err) {
      return callback(new PaySwarmError(
        'Could not remove backup source from FinancialAccount.',
        MODULE_TYPE + '.RemoveBackupSourceError', {
          account: id,
          backupSource: backupSourceId,
          'public': true
        }, err));
    }
    callback();
  });
};

/**
 * Reorders the backup sources for a Financial Account. The new order will
 * only be applied if the backup sources will not change, only their order
 * will.
 *
 * @param actor the Profile performing the action.
 * @param accountUpdate the Account to update, with id the ID of the Account to
 *          update and its new list of backup sources.
 * @param callback(err) called once the operation completes.
 */
api.reorderAccountBackupSources = function(actor, accountUpdate, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: accountUpdate.id},
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
        _checkAccountOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.account.update({
        id: payswarm.db.hash(accountUpdate.id),
        'account.backupSource': {
          $all: accountUpdate.backupSource,
          $size: accountUpdate.backupSource.length
        }
      }, {$set: {'account.backupSource': accountUpdate.backupSource}},
      payswarm.db.writeOptions, function(err) {
        callback(err);
      });
    }
  ], function(err) {
    if(err) {
      return callback(new PaySwarmError(
        'Could not reorder backup sources in FinancialAccount.',
        MODULE_TYPE + '.ReorderBackupSourcesError', {
          account: accountUpdate.id,
          'public': true
        }, err));
    }
    callback();
  });
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
  account.psaCreditDisabled = true;

  async.waterfall([
    function(callback) {
      // insert the account
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(account.id),
        owner: payswarm.db.hash(account.owner),
        incoming: {},
        outgoing: {},
        credit: {
          snapshot: new Money(0).toString(),
          pending: new Money(0).toString(),
          incoming: {}
        },
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
 * Atomically updates the credit limit for an account.
 *
 * @param id the Account ID.
 * @param options the options to use.
 *          [amount] the amount to add (negative to subtract) from the
 *            credit limit.
 * @param callback(err) called once the operation completes.
 */
function _updateCreditLimit(id, options, callback) {
  async.waterfall([
    function(callback) {
      // get account updateId and existing credit limit
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(id)}, {
          updateId: true,
          'account.creditLimit': true
        }, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not update credit limit; invalid FinancialAccount.',
          MODULE_TYPE + '.FinancialAccountNotFound',
          {account: id}));
      }

      // update credit limit
      var creditLimit = new Money(record.account.creditLimit || 0);
      creditLimit.add(options.amount);
      if(creditLimit.isNegative()) {
        return callback(new PaySwarmError(
          'Could not update credit limit; credit limit cannot be negative.',
          MODULE_TYPE + '.InvalidCreditLimit',
          {account: id, creditLimit: creditLimit.toString()}));
      }

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update FA
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.creditLimit': creditLimit.toString()
        }
      };
      // if there was no existing credit limit
      if(!('creditLimit' in record.account)) {
        // disable use of credit line until a backup source has been added
        update.$set['account.psaCreditDisabled'] = true;

        // add credit book keeping
        update.$set.credit = {
          snapshot: new Money(0).toString(),
          pending: new Money(0).toString(),
          incoming: {}
        };
      }
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(id), updateId: record.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return process.nextTick(
          _updateCreditLimit.bind(null, id, options, callback));
      }
      cb();
    }
  ], callback);
}

/**
 * Atomically updates the balance snapshot used for managing an account's
 * credit and deposits.
 *
 * @param id the Account ID.
 * @param callback(err, snapshot) called once the operation completes.
 */
function _updateBalanceSnapshot(id, callback) {
  var snapshot;
  async.waterfall([
    function(callback) {
      // get account updateId and balance
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(id)}, {
          updateId: true,
          'account.balance': true
        }, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not update credit snapshot; invalid FinancialAccount.',
          MODULE_TYPE + '.FinancialAccountNotFound',
          {account: id}));
      }

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update FA credit snapshot
      snapshot = record.account.balance;
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'credit.snapshot': snapshot
        }
      };
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(id), updateId: record.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return process.nextTick(
          _updateBalanceSnapshot.bind(null, id, callback));
      }
      cb(null, snapshot);
    }
  ], callback);
}

/**
 * Ensures that any backup sources listed by an account exist. If they don't,
 * they are removed from the account's list. The list of backup sources at the
 * time of update are returned.
 *
 * @param id the Account ID.
 * @param options the options to use.
 *          [remove] an optional backup source to remove.
 * @param callback(err, sources) called once the operation completes.
 */
function _checkBackupSources(id, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || {};
  var account;
  async.waterfall([
    function(callback) {
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(id)}, {
          'account.backupSource': true,
          'account.psaCreditDisabled': true
        }, function(err, record) {
          callback(err, record);
        });
    },
    function(record, cb) {
      // no backup sources
      if(!record || !record.account.backupSource) {
        return callback(null, []);
      }

      // ensure payment tokens exist and have a cross-reference
      account = record.account;
      var hashes = account.backupSource.map(function(id) {
        return payswarm.db.hash(id);
      });
      // TODO: support generic expiration date property
      payswarm.db.collections.paymentToken.find({
        id: {$in: hashes},
        psaStatus: 'active',
        'paymentToken.backupSourceFor': {$in: [id]}
      }, {
        'paymentToken.id': true,
        'paymentToken.ccardExpYear': true,
        'paymentToken.ccardExpMonth': true
      }).toArray(function(err, records) {
        cb(err, account.backupSource, records)
      });
    },
    function(sources, records, cb) {
      // determine # of deleted and expired backup sources
      var exists = [];
      var expired = 0;
      for(var i = 0; i < records.length; ++i) {
        var ccard = records[i].paymentToken;
        // treat backup source to remove like it doesn't exist
        if(ccard.id !== options.remove) {
          exists.push(ccard.id);
        }
        if('cardExpYear' in ccard && 'cardExpMonth' in ccard) {
          // expire an hour before deadline to avoid unnecessary txns
          var expires = new Date(ccard.cardExpYear, ccard.cardExpMonth + 1);
          expires.setTime(expires.getTime() - 1000*60*60);
          var now = new Date();
          if(now >= expires) {
            ++expired;
          }
        }
      }

      // build new list of backup sources
      var result = [];
      for(var i = 0; i < sources.length; ++i) {
        if(exists.indexOf(sources[i]) !== -1) {
          result.push(sources[i]);
        }
      }

      // update account list of backup sources, set credit disabled flag if
      // the number of non-expired backup sources is <= zero, otherwise set it
      var update = {$set: {'account.backupSource': result}};
      var psaCreditDisabled = (result.length - expired <= 0);
      // disallow removing a payment token that would disable credit line
      if(options.remove && !account.psaCreditDisabled && psaCreditDisabled) {
        return callback(new PaySwarmError(
          'Could not remove backup source from Account; removing it would ' +
          'disable the Account\'s credit line. A replacement backup source ' +
          'must be added first.', MODULE_TYPE + '.UnbackedCreditLine', {
            account: id,
            backupSource: options.remove,
            httpStatusCode: 400,
            'public': true
          }));
      }
      if(psaCreditDisabled) {
        update.$set['account.psaCreditDisabled'] = true;
      }
      else {
        update.$unset = {'account.psaCreditDisabled': true};
      }
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(id), 'account.backupSource': sources},
        update, payswarm.db.writeOptions, function(err, n) {
          if(err) {
            return cb(err);
          }
          // retry, another process did an update while we were busy
          if(n === 0) {
            return process.nextTick(
              _checkBackupSources.bind(null, id, callback));
          }
          cb(null, result);
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
