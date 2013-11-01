/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  events: require('./events'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  money: require('./money'),
  permission: require('./permission'),
  profile: require('./profile'),
  tools: require('./tools')
};
var util = require('util');
var BigNumber = require('bignumber.js');
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

var EVENT_CREDIT_PAYOFF = 'common.FinancialAccount.unbackedCreditPayoff';

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
        fields: {
          creditPaymentDue: 1,
          'credit.lastPayoffFailed': 1,
          workerId: 1,
          id: 1
        },
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
    },
    function(callback) {
      // add listener for unbacked credit payoff events
      payswarm.events.on(EVENT_CREDIT_PAYOFF, function(event) {
        payswarm.logger.debug('got unbacked credit payoff event', event);
        var options = {};
        if(event && event.details && event.details.accountId) {
          options.id = event.details.accountId;
        }
        else {
          options.reschedule =
            payswarm.config.financial.account.worker.schedule;
        }
        process.nextTick(function() {_runWorker(options);});
      });

      // run workers
      payswarm.events.emit({
        type: EVENT_CREDIT_PAYOFF,
        details: {}
      });
      callback();
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
 * Updates the credit limit (or credit backed amount) for a Financial Account.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to update.
 * @param options the options to use.
 *          [amount] the Money amount to change the credit limit by (negative to
 *            decrease the credit limit).
 *          [backedAmount] the amount to add (negative to subtract) from the
 *            backed portion of the credit line.
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
 * The information returned in the callback includes:
 *
 * balance: the new snapshot account balance (Money).
 * pending: any relevant incoming (pending) funds from deposits (Money).
 * max: the maximum deposit amount (Money) if the account does not allow
 *   stored value.
 * maxUnbacked: the maximum deposit amount (Money) to pay off unbacked credit.
 * allowStoredValue: true if the account allows stored value, false if not.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to update.
 * @param callback(err, info) called once the operation completes.
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
 * Turns instant transfer on/off for a Financial Account. If a backup source
 * is given, it will be added to the end of the ordered list of backup
 * sources.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Account to update.
 * @param options the options to use.
 *          [enable] true to enable instant transfer, false to disable.
 *          [minAmount] a minimum amount required to enable instant
 *            transfer; if no minimum amount is set when instant transfer is
 *            first enabled, then it will default to 0.
 *          [backupSource] an optional backup source to add to the Account.
 * @param callback(err) called once the operation completes.
 */
api.updateAccountInstantTransfer = function(actor, id, options, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.ACCOUNT_ADMIN, PERMISSIONS.ACCOUNT_EDIT,
        _checkAccountOwner, callback);
    },
    function(callback) {
      var update = {$set: {}};
      if('enable' in options) {
        update.$set['account.psaAllowInstantTransfer'] = !!options.enable;
      }
      if('minAmount' in options) {
        update.$set['account.psaMinInstantTransfer'] = options.minAmount.toString();
      }
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(id)}, update,
        payswarm.db.writeOptions, function(err) {
          callback(err);
      });
    },
    function(callback) {
      if(!options.backupSource) {
        return callback();
      }
      api.addAccountBackupSource(actor, id, options.backupSource, callback);
    }
  ], function(err) {
    if(err) {
      return callback(new PaySwarmError(
        'Could not update FinancialAccount\'s instant transfer feature.',
        MODULE_TYPE + '.UpdateInstantTransferError', {
          account: id,
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
  account.creditBackedAmount = new Money(0).toString();
  account.psaCreditDisabled = true;
  account.backupSource = [];

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
      if(!balance || balance.isZero() || !account.psaAllowStoredValue) {
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
 *          [backedAmount] the amount to add (negative to subtract) from the
 *            backed portion of the credit line.
 * @param callback(err) called once the operation completes.
 */
function _updateCreditLimit(id, options, callback) {
  async.waterfall([
    function(callback) {
      // get account updateId and existing credit limit
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(id)}, {
          updateId: true,
          'account.balance': true,
          'account.creditLimit': true,
          'account.creditBackedAmount': true,
          credit: true
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
      if('amount' in options) {
        creditLimit = creditLimit.add(options.amount);
        if(creditLimit.isNegative()) {
          return callback(new PaySwarmError(
            'Could not update credit limit; credit limit cannot be negative.',
            MODULE_TYPE + '.InvalidCreditLimit',
            {account: id, creditLimit: creditLimit.toString()}));
        }
      }

      // update credit backed amount
      var creditBackedAmount = new Money(
        record.account.creditBackedAmount || 0);
      var originalCreditBackedAmount = new Money(creditBackedAmount);
      if('backedAmount' in options) {
        creditBackedAmount = creditBackedAmount.add(options.backedAmount);
        if(creditBackedAmount.isNegative()) {
          return callback(new PaySwarmError(
            'Could not update credit backed amount; credit backed amount ' +
            'cannot be negative.', MODULE_TYPE + '.InvalidCreditBackedAmount',
            {account: id, creditBackedAmount: creditBackedAmount.toString()}));
        }
      }

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update FA
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.creditLimit': creditLimit.toString(),
          'account.creditBackedAmount': creditBackedAmount.toString()
        },
        $unset: {}
      };
      // if there was no existing credit limit
      if(!('creditLimit' in record.account)) {
        // disable use of credit line until a backup source has been added
        update.$set['account.psaCreditDisabled'] = true;

        // no backup source yet
        update.$set['account.backupSource'] = [];

        // add credit book keeping
        update.$set.credit = {
          snapshot: new Money(0).toString(),
          pending: new Money(0).toString(),
          incoming: {}
        };
      }
      // update payoffs and credit payment due date
      if(creditBackedAmount.compareTo(originalCreditBackedAmount) !== 0) {
        var threshold = creditBackedAmount.negate();
        var originalThreshold = originalCreditBackedAmount.negate();
        var balance = new Money(record.account.balance);
        var wasBelowThreshold = (balance.compareTo(originalThreshold) < 0);
        var nowMeetsThreshold = (balance.compareTo(threshold) >= 0);

        // consider unbacked credit paid off
        if(wasBelowThreshold && nowMeetsThreshold) {
          var payoffs = record.credit ? record.credit.payoffs || '0' : '0';
          payoffs = new BigNumber(payoffs);
          update.$set['credit.payoffs'] = payoffs.plus(1).toString();

          // clear credit payment due date and any error
          update.$unset['account.creditPaymentDue'] = true;
          update.$unset['creditPaymentDue'] = true;
          update.$unset['credit.lastPayoffFailed'] = true;
          update.$unset['credit.lastPayoffError'] = true;
        }
        // unbacked credit now considered in use
        else if(!wasBelowThreshold && !nowMeetsThreshold) {
          // set new credit payment due date
          var delta = payswarm.config.financial.transaction
            .creditPaymentDuePeriod;
          var due = new Date();
          due = payswarm.tools.w3cDate(due.setTime(due.getTime() + delta));
          update.$set['account.creditPaymentDue'] = due;
          update.$set.creditPaymentDue = new Date(due);
        }
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
 * @param callback(err, info) called once the operation completes.
 */
function _updateBalanceSnapshot(id, callback) {
  var info = {};
  async.waterfall([
    function(callback) {
      // get account updateId and balance
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(id)}, {
          updateId: true,
          'account.balance': true,
          'account.creditBackedAmount': true,
          'account.psaAllowStoredValue': true,
          'account.owner': true,
          'credit.pending': true
        }, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not update balance snapshot; invalid FinancialAccount.',
          MODULE_TYPE + '.FinancialAccountNotFound',
          {account: id}));
      }

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update FA credit snapshot
      info.snapshot = new Money(record.account.balance);
      info.pending = new Money(record.credit ? record.credit.pending || 0 : 0);
      info.max = Money.ZERO.subtract(info.snapshot).subtract(info.pending);
      info.maxUnbacked = info.max.subtract(record.creditBackedAmount || 0);
      info.allowStoredValue = (record.account.psaAllowStoredValue ||
        record.account.owner === payswarm.config.authority.id);
      // do not write to DB if stored value allowed
      if(info.allowStoredValue) {
        return callback(null, 1, null);
      }
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'credit.snapshot': info.snapshot.toString()
        }
      };
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(id), updateId: record.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, updateInfo, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return process.nextTick(
          _updateBalanceSnapshot.bind(null, id, callback));
      }
      cb(null, info);
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
 * Creates a worker ID. A worker ID is 40 hex digits long, consisting of a
 * start time (16 hex digits) concatenated with 24 random digits.
 *
 * @return the worker ID.
 */
function _createWorkerId() {
  // generate worker ID (16 hex start time + 24 hex random)
  var st = new Date().getTime().toString(16);
  while(st.length < 16) {
    st = '0' + st;
  }
  var md = crypto.createHash('sha1');
  md.update(payswarm.tools.uuid());
  return st + md.digest('hex').substr(0, 24);
}

/**
 * Runs a worker to create deposits for credit payments that are due.
 *
 * @param options the options to use:
 *          id: an optional FinancialAccount ID to specifically work on.
 *          reschedule: the number of milliseconds to wait before rescheduling
 *            another worker with the same options.
 * @param callback(err) called once the operation completes.
 */
function _runWorker(options, callback) {
  // worker expiration is used to indicate when to forcibly override another
  // worker
  var now = +new Date();
  var expiration = payswarm.config.financial.account.worker.expiration;
  var past = now - expiration;

  // encode 'past' as a worker ID (16 hex digit time + 24 zeros)
  past = past.toString(16);
  while(past.length < 16) {
    past = '0' + past;
  }
  past += '000000000000000000000000';

  // get new worker ID
  var workerId = _createWorkerId();

  /* Note: A worker will continue to run as long as it can mark an account
  that needs to have its unbacked credit paid off. The query it will use will
  be for a specific FinancialAccount (if an ID is given) or for any
  FinancialAccount that meets the following requirements: a credit payment due
  in the past, no errors set, and either no worker ID or an expired one. */

  // build query to mark accounts
  var query = {};
  query = {creditPaymentDue: {$lte: now}};
  if(options.id) {
    query.id = payswarm.db.hash(options.id);
  }
  else {
    query['credit.lastPayoffFailed'] = null;
    query.$or = [
      {worker: null},
      {worker: {$lte: past}}
    ];
  }

  payswarm.logger.debug(
    'running account worker (' + workerId + ') ' +
    'to pay off unbacked credit for account' +
    (options.id ? (' "' + options.id + '"') : 's') + '...');

  // single update and new record retrieval db write options
  var singleUpdate = payswarm.tools.extend(
    {}, payswarm.db.writeOptions, {upsert: false, multi: false});

  // run algorithm on all matching entries
  var done = false;
  async.until(function() {return done;}, function(loop) {
    async.waterfall([
      function(callback) {
        // mark a single account at a time
        payswarm.db.collections.account.update(
          query, {worker: workerId}, singleUpdate, callback);
      },
      function(n, info, callback) {
        // no marked account
        if(n === 0) {
          if(options.id) {
            // error when account isn't found and a specific ID was given
            return callback(new PaySwarmError(
              'Could not pay off unbacked credit for FinancialAccount; ' +
              'FinancialAccount not found or no unbacked credit payment ' +
              'is due.', MODULE_TYPE + '.FinancialAccountNotFound'));
          }

          // done iterating
          done = true;
          return loop();
        }
        // done iterating if working on one specific account
        if(options.id) {
          done = true;
          return callback(null, {account: {id: options.id}});
        }

        // fetch account ID where creditPaymentDue in past, no error, and
        // current worker ID is set
        payswarm.db.collections.account.findOne({
          creditPaymentDue: {$lte: now},
          'credit.lastPayoffFailed': null,
          worker: workerId
        }, {'account.id': true, 'account.backupSource': true}, callback);
      },
      function(record, callback) {
        if(!record) {
          return loop();
        }
        // handle marked account by updating balance snapshot
        payswarm.financial.updateAccountBalanceSnapshot(
          null, record.account.id, function(err, info) {
            callback(err, record, info);
        });
      },
      function(record, info, callback) {
        // check maximum unbacked credit deposit amount
        if(info.maxUnbacked.compareTo(Money.ZERO) <= 0) {
          /* Note: Here there is no unbacked credit amount to pay off because
            already pending deposits will pay it off if they settle
            successfully. Give them time to settle by switching to a new
            worker ID but leave the account marked with the old one. This
            prevents other workers from dealing with the account until the
            worker expires. It is presumed that the worker expiration time
            will be sufficiently long to prevent performance degradation due
            to churn in these unlikely scenarios. */
          var oldWorkerId = workerId;
          workerId = _createWorkerId();
          payswarm.logger.debug(
            'account worker switched ID (' + oldWorkerId + ' => ' + workerId +
            ') to give pending deposits time to settle to pay off unbacked ' +
            'credit; old worker ID marks the account to be ignored for a time');
          return loop();
        }

        // create deposit to pay off unbacked credit, cycle through backup
        // sources until successful
        var error;
        var sources = record.account.backupSource;
        async.whilst(function() {return sources.length > 0;}, function(next) {
          var source = sources.shift();
          async.waterfall([
            function(callback) {
              var deposit = {
                '@context': 'https://w3id.org/payswarm/v1',
                type: ['Transaction', 'Deposit'],
                payee: [{
                  type: 'Payee',
                  payeeGroup: ['deposit'],
                  payeeRate: info.maxUnbacked.toString(),
                  payeeRateType: 'FlatAmount',
                  payeeApplyType: 'ApplyExclusively',
                  destination: record.account.id,
                  currency: 'USD',
                  comment: 'Automated unbacked credit payment.'
                }],
                source: source
              };
              payswarm.financial.signDeposit(null, deposit, callback);
            },
            function(deposit, callback) {
              payswarm.financial.processDeposit(null, deposit, callback);
            }
          ], function(err) {
            error = err;
            if(err) {
              return next();
            }
            callback();
          });
        }, function() {
          if(!error) {
            return callback();
          }
          payswarm.logger.error(
            'account worker (' + workerId + ') encountered an ' +
            'error while attempting to payoff unbacked credit for an ' +
            'account (' + record.account.id + ')', {error: error});
          // fire event w/error details
          payswarm.events.emit({
            type: 'common.FinancialAccount.unbackedCreditPayoffFailure',
            details: {
              accountId: record.account.id,
              error: error
            }
          });

          // write error to DB
          // indicate last credit payoff failed (only perform the update if
          // the creditPaymentDue date is still in the past, etc. so if it
          // was concurrently paid off, the error will effectively be ignored)
          var dbError;
          if(error instanceof PaySwarmError) {
            dbError = error.toObject();
            delete dbError.stack;
          }
          else {
            dbError = error.toString();
          }
          payswarm.db.collections.account.update({
            id: payswarm.db.hash(record.account.id),
            creditPaymentDue: {$lte: now},
            'credit.lastPayoffFailed': null,
            worker: workerId
          }, {
            $set: {
              'credit.lastPayoffFailed': true,
              'credit.lastPayoffError': dbError
            }
          }, payswarm.db.writeOptions, function(err) {
            if(err) {
              payswarm.logger.error(
                'account worker (' + workerId + ') could not write error ' +
                'to database that was encountered during attempt to payoff ' +
                'unbacked credit for an account (' + record.account.id + ')',
                {error: err});
            }
            callback();
          });
        });
      }
    ], function(err) {
      // Note: Do not need to remove worker ID entry on account

      // prevent stack overflow
      process.nextTick(function() {
        loop(err);
      });
    });
  }, function(err) {
    if(err) {
      payswarm.logger.error('account worker encountered error', {error: err});
    }
    payswarm.logger.debug('account worker (' + workerId + ') finished.');

    // reschedule worker if requested
    if(options.reschedule) {
      payswarm.logger.debug(
        'rescheduling account worker in ' + options.reschedule + ' ms');
      setTimeout(function() {
        var event = {
          type: EVENT_CREDIT_PAYOFF,
          details: {}
        };
        payswarm.events.emit(event);
      }, options.reschedule);
    }
    if(callback) {
      callback(err);
    }
  });
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
