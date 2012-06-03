/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsonld = require('./jsonld');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  events: require('./payswarm.events'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var Money = require('./payswarm.money').Money;

// constants
var MODULE_TYPE = payswarm.financial.type;
var MODULE_IRI = payswarm.financial.iri;

var SETTLE_STATE = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  PROCESSING: 'processing',
  SETTLING: 'settling',
  SETTLED: 'settled',
  VOIDING: 'voiding',
  VOIDED: 'voided'
};

// sub module API
var api = {};
module.exports = api;

// distributed ID generator
var transactionIdGenerator = null;

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
      payswarm.db.openCollections(['transaction'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        // ID
        collection: 'transaction',
        fields: {id: true},
        options: {unique: true, background: true}
      }, {
        // identity+asset+counter
        collection: 'transaction',
        fields: {identity: 1, asset: 1, counter: 1},
        options: {unique: true, background: true}
      }, {
        // identity+referenceId
        collection: 'transaction',
        fields: {identity: 1, referenceId: 1},
        options: {unique: true, background: true}
      }, {
        // asset+identity
        collection: 'transaction',
        fields: {asset: 1, identity: 1},
        options: {unique: false, background: true}
      }, {
        // asset+date
        collection: 'transaction',
        fields: {asset: 1, date: 1},
        options: {unique: false, background: true}
      }, {
        // source+date
        collection: 'transaction',
        fields: {source: 1, date: 1},
        options: {unique: false, background: true}
      }, {
        // destination+date
        collection: 'transaction',
        fields: {destination: 1, date: 1},
        options: {unique: false, background: true}
      }, {
        // date
        collection: 'transaction',
        fields: {date: true},
        options: {unique: false, background: true}
      }, {
        // settleAfter+state+updated
        collection: 'transaction',
        fields: {'transaction.psa:settleAfter': 1, state: 1, 'meta.updated': 1},
        options: {unique: false, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      payswarm.db.getDistributedIdGenerator('transaction',
        function(err, idGenerator) {
          if(!err) {
            transactionIdGenerator = idGenerator;
          }
          callback(err);
      });
    },
    function(callback) {
      // FIXME: add listener for settle/cleanup events
    }
  ], callback);
};

/**
 * Generates the next Transaction ID.
 *
 * @param callback(err, id) called once the operation completes.
 */
api.generateTransactionId = function(callback) {
  transactionIdGenerator.generateId(function(err, id) {
    if(err) {
      return callback(err);
    }
    id = util.format('%s/transactions/%s',
      payswarm.config.authority.baseUri, id);
    callback(null, id);
  });
};

/**
 * Authorizes the given Transaction.
 *
 * @param transaction the Transaction.
 * @param [duplicateQuery] an optional query to use for checking for
 *          duplicates (default: no duplicate check).
 * @param callback(err) called once the operation completes.
 */
api.authorizeTransaction = function(transaction, duplicateQuery, callback) {
  if(typeof duplicateQuery === 'function') {
    callback = duplicateQuery;
    duplicateQuery = null;
  }

  // transaction has no assigned reference ID
  if(!('com:referenceId' in transaction)) {
    // use payswarm prefix + transaction ID
    transaction['com:referenceId'] = 'payswarm.' + transaction['@id'];
  }
  // if the transaction has no settleAfter date set, set it to now
  if(!('psa:settleAfter' in transaction)) {
    transaction['psa:settleAfter'] = +new Date();
  }
  transaction['com:settled'] = false;
  transaction['com:voided'] = false;

  async.waterfall([
    // 1. Insert pending transaction record.
    function(callback) {
      _insertTransaction(transaction, duplicateQuery, callback);
    },
    // 2. Ensure each dst FA is valid and can receive funds from src FA.
    function(callback) {
      // gather unique destination account IDs
      var accounts = {};
      var transfers = transaction['com:transfer'];
      for(var i in transfers) {
        var transfer = transfers[i];
        accounts[transfer['com:destination']] = true;
      }
      async.forEachSeries(Object.keys(accounts), function(dst, callback) {
        // check for existence
        payswarm.db.collections.account.findOne(
          {id: payswarm.db.hash(dst)}, {id: true},
          payswarm.db.readOptions, function(err, result) {
            if(!err && !result) {
              err = new PaySwarmError(
                'Could not authorize Transaction; invalid destination ' +
                'FinancialAccount.',
                MODULE_TYPE + '.FinancialAccountNotFound');
            }
            // FIXME: do other checks?
            callback(err);
          });
      }, callback);
    },
    // 3-7. Update src balance and authorize transaction.
    function(callback) {
      _authorizeTransaction(transaction, callback);
    },
    function(callback) {
      var now = +new Date();
      if(now >= transaction['psa:settleAfter']) {
        // fire an event to settle the transaction
        var event = {
          type: 'payswarm.common.Transaction.settle',
          details: {
            transactionId: transaction['@id']
          }
        };
        payswarm.events.emit(event.type, event);
      }
      callback();
    }
  ], function(err) {
    if(err) {
      if(payswarm.db.isDuplicateError(err)) {
        err = new PaySwarmError(
          'Could not create Transaction; duplicate Transaction ID.',
          MODULE_TYPE + '.DuplicateTransaction', {transaction: transaction});
      }
    }
    callback(err);
  });
};

/**
 * Voids the given Transaction.
 *
 * @param transaction the Transaction.
 * @param callback(err) called once the operation completes.
 */
api.voidTransaction = function(transaction, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  async.waterfall([
    // 1. Update transaction if it is 'pending', 'authorized', or 'voiding'.
    function(callback) {
      var update = {
        $set: {
          state: SETTLE_STATE.VOIDING,
          'meta.updated': +new Date()
        }
      };
      payswarm.db.collections.transaction.update(
        {id: transactionHash, $or: [
          {state: SETTLE_STATE.PENDING},
          {state: SETTLE_STATE.AUTHORIZED},
          {state: SETTLE_STATE.VOIDING}]},
        update, payswarm.db.writeOptions, callback);
    },
    // 2. If no update, get FT's state.
    function(n, info, callback) {
      if(n === 0) {
        payswarm.db.collections.transaction.findOne(
          {id: transactionHash}, {state: true},
          payswarm.db.readOptions, callback);
      }
      else {
        callback({state: 'voiding'});
      }
    },
    // 3. If state is not voiding or voided, raise an error.
    function(result, callback) {
      var err = null;
      if(!result) {
        err = new PaySwarmError(
          'Could not void Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound');
      }
      else if(result.state !== SETTLE_STATE.VOIDING &&
        result.state !== SETTLE_STATE.VOIDED) {
        err = new PaySwarmError(
          'Could not void Transaction; Transaction has already been ' +
          'processed.', MODULE_TYPE + '.TransactionAlreadyProcessed');
      }
      callback(err);
    },
    // 4-7. Update src balance and void transaction.
    function(callback) {
      _voidTransaction(transaction, callback);
    }
  ], callback);
};

/**
 * Processes the given Transaction.
 *
 * @param transaction the Transaction.
 * @param callback(err) called once the operation completes.
 */
api.processTransaction = function(transaction, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  async.waterfall([
    // 1. Atomically findAndModify transaction if it is 'authorized'
    // or 'processing'.
    function(callback) {
      var update = {
        $set: {
          state: SETTLE_STATE.PROCESSING,
          'meta.updated': +new Date()
        },
        $inc: {settleId: 1}
      };
      // FIXME: ensure query contains shard key for findAndModify
      payswarm.db.collections.transaction.findAndModify(
        {id: transactionHash, $or: [
          {state: SETTLE_STATE.AUTHORIZED},
          {state: SETTLE_STATE.PROCESSING}]},
        [['id', 'asc']],
        update,
        payswarm.tools.extend(
          {}, payswarm.db.writeOptions, {
            upsert: true,
            'new': true,
            fields: {'state': true, 'settleId': true
          }}),
        callback);
    },
    // 2. Get transaction state if no changes occurred.
    function(result, callback) {
      if(!result) {
        // findAndModify made no changes
        payswarm.db.collections.transaction.findOne(
          {id: transactionHash}, {state: true},
          payswarm.db.readOptions, callback);
      }
      else {
        // findAndModify updated the transaction
        callback(null, result);
      }
    },
    // 3-5. Process transaction if not voided.
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Could not process Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound'));
      }
      // transaction already processed by another process
      if(result.state === SETTLE_STATE.SETTLING ||
        result.state === SETTLE_STATE.SETTLED) {
        return callback();
      }
      if(result.state === SETTLE_STATE.VOIDING ||
        result.state === SETTLE_STATE.VOIDED) {
        return callback(new PaySwarmError(
          'Could not process Transaction; Transaction has been voided.',
          MODULE_TYPE + '.TransactionVoided'));
      }
      // process transaction
      _processTransaction(transaction, result.settleId, callback);
    },
    function(callback) {
      // settle transaction
      api.settleTransaction(transaction, callback);
    }
  ], callback);
};

/**
 * Settles the given Transaction.
 *
 * @param transaction the Transaction.
 * @param callback(err) called once the operation completes.
 */
api.settleTransaction = function(transaction, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  async.waterfall([
    // 1. Update transaction if it is 'settling'.
    function(callback) {
      var update = {
        $set: {
          state: SETTLE_STATE.SETTLING,
          'meta.updated': +new Date()
        }
      };
      payswarm.db.collections.transaction.update(
        {id: transactionHash, state: SETTLE_STATE.SETTLING},
        update, payswarm.db.writeOptions, callback);
    },
    // 2. Get FT's state and settle ID.
    function(n, info, callback) {
      payswarm.db.collections.transaction.findOne(
        {id: transactionHash}, {state: true, settleId: true},
        payswarm.db.readOptions, callback);
    },
    // 3. If state is 'settled', finish, if 'settling' settle, otherwise error.
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Could not settle Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound'));
      }
      if(result.state === SETTLE_STATE.SETTLED) {
        return callback();
      }
      if(result.state === SETTLE_STATE.SETTLING) {
        // 3-5. Settle transaction.
        return _settleTransaction(transaction, result.settleId, callback);
      }
      if(result.state === SETTLE_STATE.VOIDING ||
        result.state === SETTLE_STATE.VOIDED) {
        return callback(new PaySwarmError(
          'Could not settle Transaction; Transaction has been voided.',
          MODULE_TYPE + '.TransactionVoided'));
      }
      return callback(new PaySwarmError(
        'Could not settle Transaction; Transaction is still processing.',
        MODULE_TYPE + '.TransactionBusy'));
    }
  ], callback);
};

/**
 * Retrieves all Transactions matching the given query.
 *
 * @param actor the Profile performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 */
api.getTransactions = function(actor, query, fields, options, callback) {
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
      // FIXME: check permissions
      /*api.checkActorPermission(
        actor, PERMISSIONS.FINANCIAL_ADMIN, callback);*/
      callback();
    },
    function(callback) {
      payswarm.db.collections.transaction.find(
        query, fields, options, payswarm.db.readOptions).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves a Transaction by its ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the Transaction to retrieve.
 * @param callback(err, transaction, meta) called once the operation completes.
 */
api.getTransaction = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.profile.findOne(
        {id: payswarm.db.hash(id)}, payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      // FIXME: check permissions
      /*
      api.checkActorPermissionForObject(
        actor, result.transaction,
        PERMISSIONS.FINANCIAL_ADMIN, PERMISSIONS.FINANCIAL_ACCESS,
        _checkTransactionOwner, callback);*/
      callback(null, result);
    },
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound',
          {'@id': id}));
      }
      // remove restricted fields
      delete result.transaction['psa:settleAfter'];
      callback(null, result.transaction, result.meta);
    },
  ], callback);
};

/**
 * Atomically inserts a Transaction if it would not duplicate another
 * previous Transaction based on the given duplicate query.
 *
 * @param transaction the Transaction.
 * @param duplicateQuery the query to use to check for a duplicate Transaction.
 * @param callback(err) called once the operation completes.
 */
function _insertTransaction(transaction, duplicateQuery, callback) {
  // build source and destination hashes
  var transfers = jsonld.getValues(transaction, 'com:transfer');
  var src = payswarm.db.hash(transfers[0]['com:source']);
  var dsts = [];
  for(var i in transfers) {
    var transfer = transfers[i];
    dsts.push(payswarm.db.hash(transfer['com:destination']));
  }

  async.waterfall([
    function(callback) {
      _getTransactionIdentityAndAsset(transaction, callback);
    },
    function(identityId, assetId, callback) {
      // keep trying to insert while checking for duplicates
      var counter = 0;
      var inserted = false;
      async.until(function() {return inserted;}, function(callback) {
        async.waterfall([
          function(callback) {
            // get the last identity+asset counter
            payswarm.db.collections.transaction.findOne(
              {identity: payswarm.db.hash(identityId),
                asset: payswarm.db.hash(assetId)},
              {counter: true}, {sort: {counter: -1}},
              payswarm.db.readOptions, function(err, record) {
                if(err) {
                  return callback(err);
                }
                if(record) {
                  // update counter for insert
                  counter = record.counter + 1;
                }
              });
          },
          function(callback) {
            // run duplicate check
            if(duplicateQuery) {
              payswarm.db.collections.transaction.findOne(
                duplicateQuery, {'transaction.@id': true},
                payswarm.db.readOptions, function(err, record) {
                  if(err) {
                    return callback(err);
                  }
                  // duplicate found
                  if(record) {
                    return callback(new PaySwarmError(
                      'A Transaction already exists for the given parameters.',
                      MODULE_TYPE + '.DuplicateTransaction', {
                        transaction: record.transaction['@id'],
                        query: duplicateQuery
                      }));
                  }
                  callback();
                });
            }
            callback();
          },
          // 1. Insert pending transaction record.
          function(callback) {
            // Note: asset index for non-contracts contains transaction ID
            // hash until sparse indexes on multiple fields are supported
            // in mongo
            var now = +new Date();
            var record = {
              id: payswarm.db.hash(transaction['@id']),
              state: SETTLE_STATE.PENDING,
              updateId: 0,
              workerId: 0,
              date: Date.parse(transaction['com:date']),
              asset: payswarm.db.hash(assetId),
              identity: payswarm.db.hash(identityId),
              counter: counter,
              referenceId: payswarm.db.hash(referenceId),
              source: src,
              destination: dsts,
              meta: {
                created: now,
                updated: now
              },
              transaction: transaction
            };
            payswarm.db.collections.transaction.insert(
              record, payswarm.db.writeOptions, function(err, record) {
                // retry on duplicate
                if(payswarm.db.isDuplicateError(err)) {
                  return callback();
                }
                if(err) {
                  return callback(err);
                }
                inserted = true;
                callback();
              });
          }
        ], function(err) {
          if(err) {
            return callback(err);
          }
          callback(null);
        });
      }, callback);
    }
  ], callback);
}

/**
 * Gets the Identity and Asset IDs to associate with the given Transaction.
 *
 * @param transaction the Transaction.
 * @param callback(err, identityId, assetId) called once the operation
 *          completes.
 */
function _getTransactionIdentityAndAsset(transaction, callback) {
  async.waterfall([
    function(callback) {
      // get identity ID via asset acquirer
      var assetAcquirers = jsonld.getValues(transaction, 'ps:assetAcquirer');
      if(assetAcquirers.length > 0) {
        var assetAcquirer = assetAcquirers[0];
        if(typeof assetAcquirer === 'object') {
          assetAcquirer = assetAcquirer['@id'];
        }
        return callback(null, assetAcquirer);
      }

      // get identity ID via a financial account
      var account;
      var transfers = jsonld.getValues(transaction, 'com:transfer');

      // use first destination account for a deposit
      if(jsonld.hasValue(transaction, '@type', 'com:Deposit')) {
        account = transfers[0]['com:destination'];
      }
      // otherwise, use source account
      else {
        account = transfers[0]['com:source'];
      }

      // get account owner
      payswarm.financial.getAccount(
        null, account, function(err, account) {
          if(err) {
            return callback(err);
          }
          callback(null, account['ps:owner']);
        });
    },
    function(identityId, callback) {
      // get asset ID
      var asset;
      var assets = jsonld.getValues(transaction, 'ps:asset');
      if(assets.length > 0) {
        asset = assets[0];
       if(typeof asset === 'object') {
          asset = asset['@id'];
        }
      }
      // no asset involved, use transaction ID as asset
      else {
        asset = transaction['@id'];
      }
      callback(null, identityId, asset);
    }
  ], callback);
}

/**
 * Atomically updates the balance for the source FinancialAccount for
 * the given Transaction and authorizes it on success.
 *
 * @param transaction the Transaction.
 * @param callback(err) called once the operation completes.
 */
function _authorizeTransaction(transaction, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  var src = transaction['com:transfer'][0]['com:source'];
  async.waterfall([
    function(callback) {
      // get source account updateId and balance
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(src)},
        {updateId: true, 'account.com:balance': true},
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Could not authorize Transaction, invalid source FinancialAccount.',
          MODULE_TYPE + '.FinancialAccountNotFound'));
      }

      // subject transaction amount from balance
      var balance = new Money(result.account['com:balance']);
      var amount = new Money(transaction['com:amount']);
      balance = balance.subtract(amount);
      if(balance.isNegative()) {
        // void transaction
        return payswarm.db.collections.transaction.update(
          {id: transactionHash, state: SETTLE_STATE.PENDING},
          {$set: {state: SETTLE_STATE.VOIDING}},
          payswarm.db.writeOptions, function(err) {
            // fire event to clean up transaction
            var event = {
              type: 'payswarm.common.Transaction.cleanup',
              details: {
                transactionId: transaction['@id']
              }
            };
            payswarm.events.emit(event.type, event);

            if(err) {
              return callback(err);
            }
            callback(new PaySwarmError(
              'Could not authorize Transaction; insufficient funds in the ' +
              'source FinancialAccount.',
              MODULE_TYPE + '.InsufficientFunds'));
          });
      }

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(result.updateId);

      // update source FA (balance and add outgoing transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.com:balance': balance.toString()
        }
      };
      update.$set['outgoing.' + transactionHash] =
        transaction['psa:settleAfter'];
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(src), updateId: result.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      // if account not updated, try again
      if(n === 0) {
        return _authorizeTransaction(transaction, callback);
      }
      callback();
    },
    // account balance updated, set transaction state
    function(callback) {
      payswarm.db.collections.transaction.update(
        {id: transactionHash, state: SETTLE_STATE.PENDING},
        {$set: {state: SETTLE_STATE.AUTHORIZED, 'meta.updated': +new Date()}},
        payswarm.db.writeOptions, callback);
    },
    // raise an error if transaction was not authorized
    function(n, info, callback) {
      if(n === 0) {
        // fire event to clean up transaction
        var event = {
          type: 'payswarm.common.Transaction.cleanup',
          details: {
            transactionId: transaction['@id']
          }
        };
        payswarm.events.emit(event.type, event);
        return callback(new PaySwarmError(
          'Transaction could not be authorized; it has been voided.',
          MODULE_TYPE + '.VoidedTransaction'));
      }
      callback();
    }
  ], callback);
}

/**
 * Atomically updates the balance for the source FinancialAccount for
 * the given Transaction and voids it on success.
 *
 * @param transaction the Transaction.
 * @param callback(err) called once the operation completes.
 */
function _voidTransaction(transaction, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  var src = transaction['com:transfer'][0]['com:source'];
  async.waterfall([
    function(callback) {
      // get source account updateId and balance
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(src)},
        {updateId: true, 'account.com:balance': true},
        payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        // account doesn't exist, proceed as if it was updated
        return callback(null, 1);
      }

      // add transaction amount to balance
      var balance = new Money(result.account['com:balance']);
      var amount = new Money(transaction['com:amount']);
      balance = balance.add(amount);

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(result.updateId);

      // update source FA (balance and remove outgoing transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.com:balance': balance.toString()
        },
        $unset: {}
      };
      update.$unset['outgoing.' + transactionHash] = 1;
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(src), updateId: result.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      // if account not updated, try again
      if(n === 0) {
        return _voidTransaction(transaction, callback);
      }
      callback();
    },
    // account balance updated, set transaction state
    function(callback) {
      payswarm.db.collections.transaction.update(
        {id: transactionHash},
        {$set: {
          state: SETTLE_STATE.VOIDED,
          'transaction.com:voided': false,
          'meta.updated': +new Date()}},
        payswarm.db.writeOptions, function(err) {callback(err);});
    }
  ], callback);
}

/**
 * Atomically adds the incoming Transaction to destination FinancialAccounts
 * and updates their escrow balances. The Transaction is marked as settling
 * on success.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param callback(err) called once the operation completes.
 */
function _processTransaction(transaction, settleId, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);

  // calculate total amounts for each destination account
  var transfers = transaction['com:transfer'];
  var accounts = {};
  for(var i in transfers) {
    var transfer = transfers[i];
    var dst = transfer['com:destination'];
    var total = (dst in accounts) ? accounts[dst] : new Money(0);
    var amount = new Money(transfer['com:amount']);
    total = total.add(amount);
    accounts[dst] = total;
  }

  // 4. Handle each dst account in transaction.
  async.forEachSeries(Object.keys(accounts), function(dst, callback) {
    async.waterfall([
      function(callback) {
        _escrowDestinationFunds(
          transaction, settleId, dst, accounts[dst], callback);
      },
      // 5. Set transaction state to settling where old settle ID matches.
      function(callback) {
        payswarm.db.collections.transaction.update(
          {id: transactionHash, settleId: settleId,
            state: SETTLE_STATE.PROCESSING},
          {$set: {
            state: SETTLE_STATE.SETTLING,
            'meta.updated': +new Date()
          }},
          payswarm.db.writeOptions, callback);
      },
      // if no update, get FT's state.
      function(n, info, callback) {
        if(n === 0) {
          payswarm.db.collections.transaction.findOne(
            {id: transactionHash}, {'state': true},
            payswarm.db.readOptions, callback);
        }
        else {
          callback({state: 'settled'});
        }
      },
      // if state is 'settling' or 'settled', finish, otherwise error
      function(result, callback) {
        if(!result) {
          return callback(new PaySwarmError(
            'Could not process Transaction; Transaction not found.',
            MODULE_TYPE + '.TransactionNotFound'));
        }
        if(result.state === SETTLE_STATE.SETTLING ||
          result.state === SETTLE_STATE.SETTLED) {
          return callback();
        }
        if(result.state === SETTLE_STATE.PROCESSING) {
          return callback(new PaySwarmError(
            'Could not process Transaction; another process has assumed ' +
            'responsibility for processing this Transaction.',
            MODULE_TYPE + '.TransactionOveridden'));
        }
        if(result.state === SETTLE_STATE.VOIDING ||
          result.state === SETTLE_STATE.VOIDED) {
          return callback(new PaySwarmError(
            'Could not process Transaction; Transaction has been voided.',
            MODULE_TYPE + '.TransactionVoided'));
        }
        return callback(new PaySwarmError(
          'Could not process Transaction; invalid Transaction state.',
          MODULE_TYPE + '.InvalidTransactionState'));
      }
    ], callback);
  }, callback);
}

/**
 * Atomically updates the escrow balance for a destination
 * FinancialAccount and adds an incoming Transaction entry to it.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param dst the ID of the destination FinancialAccount.
 * @param amount the amount to add to the balance and subtract from escrow.
 * @param callback(err) called once the operation completes.
 */
function _escrowDestinationFunds(
  transaction, settleId, dst, amount, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  var incoming = 'incoming.' + transactionHash;
  async.waterfall([
    function(callback) {
      // get destination account updateId and escrow where no incoming
      // transaction entry exists or where the settle ID is older than
      // the current settle ID
      var query = {id: payswarm.db.hash(dst)};
      payswarm.db.collections.account.findOne(
        query, {
          updateId: true,
          incoming: true,
          'account.com:escrow': true
        }, payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        return callback(new PaySwarmError(
          'Could not process Transaction, invalid destination ' +
          'FinancialAccount.',
          MODULE_TYPE + '.FinancialAccountNotFound'));
      }

      // if a more recent (greater) settle ID is set on the incoming
      // transaction entry, then abort, this process has been overridden
      var oldSettleId = result.incoming[transactionHash];
      if(oldSettleId !== null) {
        if(oldSettleId > settleId) {
          return callback(new PaySwarmError(
            'Could not process Transaction; another process has assumed ' +
            'responsibility for processing this Transaction.',
            MODULE_TYPE + '.TransactionOveridden'));
        }
      }

      // add account amount to escrow
      var escrow = new Money(result.account['com:escrow']);
      escrow = escrow.add(amount);

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(result.updateId);

      // update destination FA (escrow and add incoming transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.com:escrow': escrow.toString()
        }
      };
      update.$set[incoming] = settleId;
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(src), updateId: result.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      // if account not updated, try again
      if(n === 0) {
        return _escrowDestinationFunds(
          transaction, settleId, dst, amount, callback);
      }
      callback();
    }
  ], callback);
}

/**
 * Atomically updates the balance for the destination FinancialAccounts,
 * and removes the source FinancialAccount outgoing Transaction entry for
 * the given Transaction. The Transaction is marked settled on success.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param callback(err) called once the operation completes.
 */
function _settleTransaction(transaction, settleId, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  var src = transaction['com:transfer'][0]['com:source'];

  // calculate total amounts for each destination account
  var transfers = transaction['com:transfer'];
  var accounts = {};
  for(var i in transfers) {
    var transfer = transfers[i];
    var dst = transfer['com:destination'];
    var total = (dst in accounts) ? accounts[dst] : new Money(0);
    var amount = new Money(transfer['com:amount']);
    total = total.add(amount);
    accounts[dst] = total;
  }

  // 3. Handle each dst account in transaction.
  async.forEachSeries(Object.keys(accounts), function(dst, callback) {
    async.waterfall([
      function(callback) {
        _settleDestinationAccount(
          transaction, settleId, dst, accounts[dst], callback);
      },
      // 4. Remove source outgoing transaction.
      function(callback) {
        var update = {
          $set: {'meta.updated': +new Date()},
          $unset: {}
        };
        update.$unset['outgoing.' + transactionHash] = 1;
        payswarm.db.collections.account.update(
          {id: payswarm.db.hash(src)}, update,
          payswarm.db.writeOptions, callback);
      },
      // 5. Set transaction state to settled.
      function(callback) {
        payswarm.db.collections.transaction.update(
          {id: transactionHash, state: SETTLE_STATE.SETTLING},
          {$set: {
            state: SETTLE_STATE.SETTLED,
            'transaction.com:settled': true,
            'meta.updated': +new Date()}},
          payswarm.db.writeOptions, callback);
      },
      // if no update, get FT's state.
      function(n, info, callback) {
        if(n === 0) {
          payswarm.db.collections.transaction.findOne(
            {id: transactionHash}, {state: true},
            payswarm.db.readOptions, callback);
        }
        else {
          callback({state: 'settled'});
        }
      },
      // if state is 'settled', finish, otherwise error
      function(result, callback) {
        if(!result) {
          return callback(new PaySwarmError(
            'Could not settle Transaction; Transaction not found.',
            MODULE_TYPE + '.TransactionNotFound'));
        }
        if(result.state === SETTLE_STATE.SETTLED) {
          return callback();
        }
        return callback(new PaySwarmError(
          'Could not settle Transaction; invalid Transaction state.',
          MODULE_TYPE + '.InvalidTransactionState'));
      }
    ], callback);
  }, callback);
}

/**
 * Atomically updates the balance for a single destination FinancialAccount
 * in a Transaction during settlement.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param dst the ID of the destination FinancialAccount.
 * @param amount the amount to add to the balance and subtract from escrow.
 * @param callback(err) called once the operation completes.
 */
function _settleDestinationAccount(
  transaction, settleId, dst, amount, callback) {
  var transactionHash = payswarm.db.hash(transaction['@id']);
  var incoming = 'incoming.' + transactionHash;
  async.waterfall([
    function(callback) {
      // get destination account updateId and balance
      var query = {id: payswarm.db.hash(dst)};
      query[incoming].$exists = true;
      payswarm.db.collections.account.findOne(
        query, {
          updateId: true,
          incoming: true,
          'account.com:balance': true,
          'account.com:escrow': true
        }, payswarm.db.readOptions, callback);
    },
    function(result, callback) {
      if(!result) {
        // account already updated, proceed
        return callback(null, 1);
      }

      // remove entries that are less than settle ID
      if(result.incoming[transactionHash] < settleId) {
        var update = {$unset: {}};
        update.$unset[incoming] = 1;
        return payswarm.db.collections.account.update(
          {id: payswarm.db.hash(src)}, update,
          payswarm.db.writeOptions, function(err) {callback(null, 1);});
      }

      // add account amount to balance and subtract from escrow
      var balance = new Money(result.account['com:balance']);
      balance = balance.add(amount);
      var escrow = new Money(result.account['com:escrow']);
      escrow = escrow.subtract(amount);

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(result.updateId);

      // update destination FA (balance and remove incoming transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.com:balance': balance.toString(),
          'account.com:escrow': escrow.toString()
        },
        $unset: {}
      };
      update.$unset[incoming] = 1;
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(src), updateId: result.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      // if account not updated, try again
      if(n === 0) {
        return _settleDestinationAccount(
          transaction, settleId, dst, amount, callback);
      }
      callback();
    }
  ], callback);
}
