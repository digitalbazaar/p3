/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  events: require('./payswarm.events'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  resource: require('./payswarm.resource'),
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

var EVENT_SETTLE = 'payswarm.common.Transaction.settle';
var EVENT_VOID = 'payswarm.common.Transaction.void';

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
        fields: {id: 1},
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
        fields: {asset: 1, created: 1},
        options: {unique: false, background: true}
      }, {
        // source+date
        collection: 'transaction',
        fields: {source: 1, created: 1},
        options: {unique: false, background: true}
      }, {
        // destination+date
        collection: 'transaction',
        fields: {destination: 1, created: 1},
        options: {unique: false, background: true}
      }, {
        // date
        collection: 'transaction',
        fields: {created: 1},
        options: {unique: false, background: true}
      }, {
        // workers.id
        collection: 'transaction',
        fields: {'workers.id': 1},
        options: {unique: false, background: true}
      }, {
        // state+settleAfter+workers.id
        collection: 'transaction',
        fields: {state: 1, 'transaction.psaSettleAfter': 1, 'workers.id': 1},
        options: {unique: false, background: true}
      }, {
        // workers.start+settleAfter+state
        collection: 'transaction',
        fields: {'workers.start': 1, 'transaction.psaSettleAfter': 1, state: 1},
        options: {unique: false, background: true}
      }], callback);
    },
    //_registerPermissions,
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
      // add listener for settle events
      payswarm.events.on(EVENT_SETTLE, function(event) {
        payswarm.logger.debug('got event', event);
        var options = {algorithm: 'settle'};
        if(event && event.details && event.details.transactionId) {
          options.id = event.details.transactionId;
        }
        else {
          options.reschedule =
            payswarm.config.financial.transactionWorkerSchedule;
        }
        process.nextTick(function() {_runWorker(options);});
      });
      // add listener for void events
      payswarm.events.on(EVENT_VOID, function(event) {
        payswarm.logger.debug('got event', event);
        var options = {algorithm: 'void'};
        if(event && event.details && event.details.transactionId) {
          options.transactionId = event.details.transactionId;
        }
        else {
          options.reschedule =
            payswarm.config.financial.transactionWorkerSchedule;
        }
        process.nextTick(function() {_runWorker(options);});
      });

      // run workers
      payswarm.events.emit(EVENT_SETTLE, {details:{}});
      payswarm.events.emit(EVENT_VOID, {details:{}});

      callback();
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
  if(!('referenceId' in transaction)) {
    // use payswarm prefix + transaction ID
    transaction.referenceId = 'payswarm.' + transaction.id;
  }
  // if the transaction has no settleAfter date set, set it to now
  if(!('psaSettleAfter' in transaction)) {
    transaction.psaSettleAfter = +new Date();
  }

  async.waterfall([
    // 1. Insert pending transaction record.
    function(callback) {
      _insertTransaction(transaction, duplicateQuery, callback);
    },
    // 2. Ensure each dst FA is valid and can receive funds from src FA.
    function(callback) {
      // gather unique destination account IDs
      var accounts = {};
      var transfers = transaction.transfer;
      for(var i in transfers) {
        var transfer = transfers[i];
        accounts[transfer.destination] = true;
      }
      async.forEachSeries(Object.keys(accounts), function(dst, callback) {
        // check for existence
        payswarm.db.collections.account.findOne(
          {id: payswarm.db.hash(dst)}, {id: true},
          function(err, record) {
            if(!err && !record) {
              err = new PaySwarmError(
                'Could not authorize Transaction; invalid destination ' +
                'FinancialAccount.',
                MODULE_TYPE + '.FinancialAccountNotFound',
                {account: dst});
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
      if(now >= transaction.psaSettleAfter) {
        // fire an event to settle the transaction
        var event = {
          type: EVENT_SETTLE,
          details: {
            transactionId: transaction.id
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
 * Voids the Transaction with the given ID.
 *
 * @param transaction the ID of the Transaction to void.
 * @param callback(err) called once the operation completes.
 */
api.voidTransaction = function(transactionId, callback) {
  payswarm.logger.debug('voiding transaction', transactionId);
  var transactionHash = payswarm.db.hash(transactionId);
  async.waterfall([
    // 1. Update transaction if it is 'pending', 'authorized', or 'voiding'.
    function(callback) {
      var update = {
        $set: {
          state: SETTLE_STATE.VOIDING,
          'transaction.voided': payswarm.tools.w3cDate(),
          'meta.updated': +new Date
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
      // get record regardless of update to ensure transaction is looked up
      payswarm.db.collections.transaction.findOne(
        {id: transactionHash}, {state: true, transaction: true}, callback);
    },
    // 3. If state is not voiding or voided, raise an error.
    function(record, callback) {
      var err = null;
      if(!record) {
        err = new PaySwarmError(
          'Could not void Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound');
      }
      else if(record.state !== SETTLE_STATE.VOIDING &&
        record.state !== SETTLE_STATE.VOIDED) {
        err = new PaySwarmError(
          'Could not void Transaction; Transaction has already been ' +
          'processed.', MODULE_TYPE + '.TransactionAlreadyProcessed');
      }
      callback(err, record);
    },
    // 4-7. Update src balance and void transaction.
    function(record, callback) {
      _voidTransaction(record.transaction, callback);
    }
  ], callback);
};

/**
 * Settles the Transaction with the given ID. This call will process
 * and settle a Transaction.
 *
 * @param transactionId the ID of the Transaction to settle.
 * @param callback(err) called once the operation completes.
 */
api.settleTransaction = function(transactionId, callback) {
  // run transaction worker w/settle algorithm
  _runWorker({algorithm: 'settle', id: transactionId}, callback);
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
        query, fields, options).toArray(callback);
    },
    function(records, callback) {
      async.forEach(records, function(record, callback) {
        var txn = record.transaction;
        if(txn) {
          // remove restricted fields
          delete txn.psaSettleAfter;

          // restore full @context
          txn['@context'] = payswarm.tools.getDefaultJsonLdContext();
        }
        // no extra data to fetch for non-contracts
        if(!txn || !jsonld.hasValue(txn, 'type', 'ps:Contract')) {
          return callback();
        }

        // get asset/license/listing info
        async.auto({
          getAsset: function(callback) {
            payswarm.resource.asset.get({
              id: txn.asset,
              hash: txn.assetHash,
              type: 'ps:Asset',
              store: false,
              strict: true,
              fetch: false
            }, callback);
          },
          getLicense: function(callback) {
            payswarm.resource.license.get({
              id: txn.license,
              hash: txn.licenseHash,
              type: 'ps:License',
              store: false,
              strict: true,
              fetch: false
            }, callback);
          },
          getListing: function(callback) {
            payswarm.resource.listing.get({
              id: txn.listing,
              hash: txn.listingHash,
              type: 'ps:Listing',
              store: false,
              strict: true,
              fetch: false
            }, callback);
          }
        }, function(err, results) {
          if(err) {
            return callback(err);
          }
          txn.asset = results.getAsset[0];
          txn.license = results.getLicense[0];
          txn.listing = results.getListing[0];
          delete txn.assetHash;
          delete txn.licenseHash;
          callback();
        });
      }, function(err) {
        if(err) {
          return callback(err);
        }
        callback(null, records);
      });
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
      api.getTransactions(
        null, {id: payswarm.db.hash(id)},
        {transaction: true, meta: true}, {limit: 1}, callback);
    },
    function(records, callback) {
      if(records.length === 0) {
        return callback(new PaySwarmError(
          'Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound', {id: id}));
      }
      callback(null, records[0]);
    },
    function(record, callback) {
      // FIXME: check permissions
      /*
      api.checkActorPermissionForObject(
        actor, record.transaction,
        PERMISSIONS.FINANCIAL_ADMIN, PERMISSIONS.FINANCIAL_ACCESS,
        _checkTransactionOwner, callback);*/
      callback(null, record);
    },
    function(record, callback) {
      callback(null, record.transaction, record.meta);
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
  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = payswarm.db.hash(transfers[0].source);
  var dsts = [];
  for(var i in transfers) {
    var transfer = transfers[i];
    dsts.push(payswarm.db.hash(transfer.destination));
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
            payswarm.db.collections.transaction.find(
              {identity: payswarm.db.hash(identityId),
                asset: payswarm.db.hash(assetId)},
              {counter: true}).sort({counter: -1}).limit(1).toArray(
              function(err, records) {
                if(err) {
                  return callback(err);
                }
                if(records.length > 0) {
                  // update counter for insert
                  counter = records[0].counter + 1;
                }
                callback();
              });
          },
          function(callback) {
            // run duplicate check
            if(duplicateQuery) {
              payswarm.db.collections.transaction.findOne(
                duplicateQuery, {'transaction.id': true},
                function(err, record) {
                  if(err) {
                    return callback(err);
                  }
                  // duplicate found
                  if(record) {
                    return callback(new PaySwarmError(
                      'A Transaction already exists for the given parameters.',
                      MODULE_TYPE + '.DuplicateTransaction', {
                        transaction: record.transaction.id,
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

            // create transaction to store in record; optimize storage of
            // asset/license/listing by only linking to them here
            var txn = payswarm.tools.extend({}, transaction);
            txn['@context'] = payswarm.tools.getDefaultJsonLdContextUrl();
            if(jsonld.hasValue(txn, 'type', 'ps:Contract')) {
              txn.asset = txn.asset.id;
              txn.assetHash = txn.listing.assetHash;
              txn.license = txn.license.id;
              txn.licenseHash = txn.listing.licenseHash;
              txn.listing = txn.listing.id;
            }

            // create record
            var now = +new Date();
            var record = {
              id: payswarm.db.hash(transaction.id),
              state: SETTLE_STATE.PENDING,
              settleId: 0,
              workers: [],
              created: Date.parse(transaction.created),
              asset: payswarm.db.hash(assetId),
              identity: payswarm.db.hash(identityId),
              counter: counter,
              referenceId: payswarm.db.hash(transaction.referenceId),
              source: src,
              destination: dsts,
              meta: {
                created: now,
                updated: now
              },
              transaction: txn
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
        ], callback);
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
      var assetAcquirers = jsonld.getValues(transaction, 'assetAcquirer');
      if(assetAcquirers.length > 0) {
        var assetAcquirer = assetAcquirers[0];
        if(payswarm.tools.isObject(assetAcquirer)) {
          assetAcquirer = assetAcquirer.id;
        }
        return callback(null, assetAcquirer);
      }

      // get identity ID via a financial account
      var account;
      var transfers = jsonld.getValues(transaction, 'transfer');

      // use first destination account for a deposit
      if(jsonld.hasValue(transaction, 'type', 'com:Deposit')) {
        account = transfers[0].destination;
      }
      // otherwise, use source account
      else {
        account = transfers[0].source;
      }

      // get account owner
      payswarm.financial.getAccount(
        null, account, function(err, account) {
          if(err) {
            return callback(err);
          }
          callback(null, account.owner);
        });
    },
    function(identityId, callback) {
      // get asset ID
      var asset;
      var assets = jsonld.getValues(transaction, 'asset');
      if(assets.length > 0) {
        asset = assets[0];
        if(payswarm.tools.isObject(asset)) {
          asset = asset.id;
        }
      }
      // no asset involved, use transaction ID as asset
      else {
        asset = transaction.id;
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
  // FIXME: ensure there aren't attacks against deposit check,
  // can an attack add com:Deposit to a transaction and avoid paying?
  var isDeposit = jsonld.hasValue(transaction, 'type', 'com:Deposit');
  var transactionHash = payswarm.db.hash(transaction.id);
  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;
  async.waterfall([
    function(callback) {
      // skip deposit, handled externally
      if(isDeposit) {
        return callback(null, null);
      }

      // get source account updateId and balance
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(src)},
        {updateId: true, 'account.balance': true}, callback);
    },
    function(record, callback) {
      // skip deposit, handled externally
      if(isDeposit) {
        return callback(null, 1, null);
      }

      if(!record) {
        return callback(new PaySwarmError(
          'Could not authorize Transaction, invalid source FinancialAccount.',
          MODULE_TYPE + '.FinancialAccountNotFound',
          {account: src}));
      }

      // subject transaction amount from balance
      var balance = new Money(record.account.balance);
      var amount = new Money(transaction.amount);
      balance = balance.subtract(amount);
      // FIXME: allow negative balances when credit is permitted
      if(balance.isNegative()) {
        // void transaction
        return payswarm.db.collections.transaction.update(
          {id: transactionHash, state: SETTLE_STATE.PENDING},
          {$set: {state: SETTLE_STATE.VOIDING}},
          payswarm.db.writeOptions, function(err) {
            // fire event to void transaction
            var event = {
              type: EVENT_VOID,
              details: {
                transactionId: transaction.id
              }
            };
            payswarm.events.emit(event.type, event);

            if(err) {
              return callback(err);
            }
            callback(new PaySwarmError(
              'Could not authorize Transaction; insufficient funds in the ' +
              'source FinancialAccount.',
              MODULE_TYPE + '.InsufficientFunds',
              {account: src}));
          });
      }

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update source FA (balance and add outgoing transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.balance': balance.toString()
        }
      };
      update.$set['outgoing.' + transactionHash] =
        transaction.psaSettleAfter;
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(src), updateId: record.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return _authorizeTransaction(transaction, callback);
      }
      cb();
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
        // fire event to void transaction
        var event = {
          type: EVENT_VOID,
          details: {
            transactionId: transaction.id
          }
        };
        payswarm.events.emit(event.type, event);
        return callback(new PaySwarmError(
          'Transaction could not be authorized; it has been voided.',
          MODULE_TYPE + '.VoidedTransaction', event.details));
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
  var isDeposit = jsonld.hasValue(transaction, 'type', 'com:Deposit');
  var transactionHash = payswarm.db.hash(transaction.id);
  var outgoing = 'outgoing.' + transactionHash;
  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;
  async.waterfall([
    function(callback) {
      // skip deposit, handled externally
      if(isDeposit) {
        return callback(null, null);
      }

      // get source account updateId and balance
      var query = {id: payswarm.db.hash(src)};
      query[outgoing] = {$exists: true};
      payswarm.db.collections.account.findOne(
        query, {updateId: true, 'account.balance': true}, callback);
    },
    function(record, callback) {
      if(!record) {
        // account doesn't exist (or its outgoing txn entry has already been
        // cleaned up), proceed as if it was updated
        return callback(null, 1, null);
      }

      // add transaction amount to balance
      var balance = new Money(record.account.balance);
      var amount = new Money(transaction.amount);
      balance = balance.add(amount);

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update source FA (balance and remove outgoing transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.balance': balance.toString()
        },
        $unset: {}
      };
      update.$unset[outgoing] = true;
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(src), updateId: record.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return _voidTransaction(transaction, callback);
      }
      cb();
    },
    // account balance updated, set transaction state
    function(callback) {
      payswarm.db.collections.transaction.update(
        {id: transactionHash},
        {$set: {
          state: SETTLE_STATE.VOIDED,
          'meta.updated': +new Date()}},
        payswarm.db.writeOptions, function(err) {callback(err);});
    }
  ], callback);
}

/**
 * Processes the Transaction associated with the given ID.
 *
 * @param transactionId the ID of the Transaction to process.
 * @param callback(err) called once the operation completes.
 */
function _processTransaction(transactionId, callback) {
  payswarm.logger.debug('processing transaction', transactionId);
  var transactionHash = payswarm.db.hash(transactionId);
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
        payswarm.tools.extend({}, payswarm.db.writeOptions, {
          upsert: false,
          'new': true,
          fields: {state: true, settleId: true, transaction: true}
        }),
        function(err, record) {
          callback(err, record);
        });
    },
    // 2. Get transaction state if no changes occurred.
    function(record, callback) {
      if(!record) {
        // findAndModify made no changes
        return payswarm.db.collections.transaction.findOne(
          {id: transactionHash},
          {state: true, settleId: true, transaction: true},
          callback);
      }
      // findAndModify updated the transaction
      callback(null, record);
    },
    // 3-5. Process transaction if not voided.
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not process Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound'));
      }
      // transaction already processed by another process
      if(record.state === SETTLE_STATE.SETTLING ||
        record.state === SETTLE_STATE.SETTLED) {
        return callback(null, record);
      }
      if(record.state === SETTLE_STATE.VOIDING ||
        record.state === SETTLE_STATE.VOIDED) {
        return callback(new PaySwarmError(
          'Could not process Transaction; Transaction has been voided.',
          MODULE_TYPE + '.TransactionVoided'));
      }
      // add incoming txn entries
      _addIncomingEntries(record.transaction, record.settleId, callback);
    },
    function(record, callback) {
      // settle transaction
      _settleTransaction(record.transaction, record.settleId, callback);
    }
  ], callback);
};

/**
 * Atomically adds the incoming Transaction entries to destination
 * FinancialAccounts. The Transaction is marked as settling on success.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param callback(err, record) called once the operation completes.
 */
function _addIncomingEntries(transaction, settleId, callback) {
  var transactionHash = payswarm.db.hash(transaction.id);
  var incoming = 'incoming.' + transactionHash;

  // get unique destination accounts
  var transfers = jsonld.getValues(transaction, 'transfer');
  var accounts = {};
  for(var i in transfers) {
    accounts[transfers[i].destination] = true;
  }

  async.waterfall([
    function(callback) {
      // 4. Handle each dst account in transaction.
      async.forEachSeries(Object.keys(accounts), function(dst, callback) {
        async.waterfall([
          function(callback) {
            // try to add/update destination account incoming entry where
            // existing settleId <= given one (or there is no existing one)
            var query = {id: payswarm.db.hash(dst), $or: [{}, {}]};
            query.$or[0][incoming] = {$exists: false};
            query.$or[1][incoming] = {$lte: settleId};
            var update = {$set: {'meta.updated': +new Date()}};
            update.$set[incoming] = settleId;
            payswarm.db.collections.account.update(
              query, update, payswarm.db.writeOptions, callback);
          },
          function(n, info, callback) {
            // entry updated, done
            if(n === 1) {
              return callback();
            }
            // no update, safe to assume another worker has overridden this one
            payswarm.logger.debug(
              'transaction worker for transaction ' + transaction.id +
              ' overridden');

            // clean up any destination accounts that have been written to
            _cleanDestinationAccounts(transaction, settleId, function(err) {
              // set error to break out of for each loop
              if(!err) {
                err = new PaySwarmError(
                  'Transaction processing interrupted.',
                  MODULE_TYPE + '.ProcessingInterrupted');
              }
              callback(err);
            });
          }
        ], callback);
      }, function(err) {
        // clear error that was used to break out of for each loop, the code
        // that is next in the waterfall can be executed in either case
        // (success or interruption)
        if(err && err.name === (MODULE_TYPE + '.ProcessingInterrupted')) {
          err = null;
        }
        callback(err);
      });
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
        return payswarm.db.collections.transaction.findOne(
          {id: transactionHash}, {state: true, settleId: true}, callback);
      }
      callback(null, {state: SETTLE_STATE.SETTLING, settleId: settleId});
    },
    // if state is 'settling' or 'settled', finish, otherwise error
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not process Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound'));
      }
      // include txn in record (avoids returning from db)
      record.transaction = transaction;
      if(record.state === SETTLE_STATE.SETTLING ||
        record.state === SETTLE_STATE.SETTLED) {
        return callback(null, record);
      }
      if(record.state === SETTLE_STATE.PROCESSING) {
        return callback(new PaySwarmError(
          'Could not process Transaction; another process has assumed ' +
          'responsibility for processing this Transaction.',
          MODULE_TYPE + '.TransactionOverridden'));
      }
      if(record.state === SETTLE_STATE.VOIDING ||
        record.state === SETTLE_STATE.VOIDED) {
        return callback(new PaySwarmError(
          'Could not process Transaction; Transaction has been voided.',
          MODULE_TYPE + '.TransactionVoided'));
      }
      return callback(new PaySwarmError(
        'Could not process Transaction; invalid Transaction state.',
        MODULE_TYPE + '.InvalidTransactionState'));
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
  var isDeposit = jsonld.hasValue(transaction, 'type', 'com:Deposit');
  var transactionHash = payswarm.db.hash(transaction.id);
  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;

  // calculate total amounts for each destination account
  var transfers = transaction.transfer;
  var accounts = {};
  for(var i in transfers) {
    var transfer = transfers[i];
    var dst = transfer.destination;
    var amount = new Money(transfer.amount);
    accounts[dst] = (dst in accounts) ? accounts[dst].add(amount) : amount;
  }

  async.waterfall([
    // 3. Handle each dst account in transaction.
    function(callback) {
      async.forEachSeries(Object.keys(accounts), function(dst, callback) {
        _settleDestinationAccount(
          transaction.id, settleId, dst, accounts[dst], callback);
      }, callback);
    },
    // 4. Remove source outgoing transaction.
    function(callback) {
      // skip deposit, handled externally
      if(isDeposit) {
        return callback();
      }

      var update = {
        $set: {'meta.updated': +new Date()},
        $unset: {}
      };
      update.$unset['outgoing.' + transactionHash] = true;
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(src)}, update,
        payswarm.db.writeOptions, function(err) {
          callback(err);
        });
    },
    // 5. Set transaction state to settled.
    function(callback) {
      payswarm.db.collections.transaction.update(
        {id: transactionHash, state: SETTLE_STATE.SETTLING},
        {$set: {
          state: SETTLE_STATE.SETTLED,
          'transaction.settled': payswarm.tools.w3cDate(),
          'meta.updated': +new Date()}},
        payswarm.db.writeOptions, callback);
    },
    // if no update, get FT's state.
    function(n, info, callback) {
      if(n === 0) {
        return payswarm.db.collections.transaction.findOne(
          {id: transactionHash}, {state: true}, callback);
      }
      callback(null, {state: SETTLE_STATE.SETTLED});
    },
    // if state is 'settled', finish, otherwise error
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not settle Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound'));
      }
      if(record.state === SETTLE_STATE.SETTLED) {
        return callback();
      }
      return callback(new PaySwarmError(
        'Could not settle Transaction; invalid Transaction state.',
        MODULE_TYPE + '.InvalidTransactionState'));
    }
  ], callback);
}

/**
 * Atomically updates the balance for a single destination FinancialAccount
 * in a Transaction during settlement if the settleId matches the incoming
 * Transaction entry. If the entry's settleId is older than the given one,
 * the entry is removed without altering the balance, and if it is newer,
 * no changes are made.
 *
 * @param transactionId the ID of the Transaction.
 * @param settleId the Transaction settle ID.
 * @param dst the ID of the destination FinancialAccount.
 * @param amount the amount to add to the balance.
 * @param callback(err) called once the operation completes.
 */
function _settleDestinationAccount(
  transactionId, settleId, dst, amount, callback) {
  var transactionHash = payswarm.db.hash(transactionId);
  var incoming = 'incoming.' + transactionHash;
  async.waterfall([
    function(callback) {
      // get destination account updateId and balance
      var query = {id: payswarm.db.hash(dst)};
      query[incoming] = {$exists: true};
      payswarm.db.collections.account.findOne(
        query, {
          updateId: true,
          incoming: true,
          'account.balance': true
        }, callback);
    },
    function(record, callback) {
      if(!record) {
        // account already updated, proceed
        return callback(null, 1, null);
      }

      // remove entry and quit early if less than settle ID
      if(record[incoming] < settleId) {
        var update = {$unset: {}};
        update.$unset[incoming] = true;
        return payswarm.db.collections.account.update(
          {id: payswarm.db.hash(dst)}, update,
          payswarm.db.writeOptions, function(err) {
            callback(err, 1, null);
          });
      }

      // add account amount to balance
      var balance = new Money(record.account.balance);
      balance = balance.add(amount);

      // get next update ID
      var updateId = payswarm.db.getNextUpdateId(record.updateId);

      // update destination FA (balance and remove incoming transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.balance': balance.toString()
        },
        $unset: {}
      };
      update.$unset[incoming] = true;
      payswarm.db.collections.account.update(
        {id: payswarm.db.hash(dst), updateId: record.updateId},
        update, payswarm.db.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return _settleDestinationAccount(
          transactionId, settleId, dst, amount, callback);
      }
      cb();
    }
  ], callback);
}

/**
 * Cleans any dangling incoming Transaction entries from destination
 * FinancialAccounts when a worker is overridden.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param callback(err) called once the operation completes.
 */
function _cleanDestinationAccounts(transaction, settleId, callback) {
  payswarm.logger.debug(
    'cleaning up incoming destination account entries for transaction ' +
    transaction.id);

  // clean each dst account in transaction
  var transfers = jsonld.getValues(transaction, 'transfer');
  async.forEachSeries(transfers, function(transfer, callback) {
    _cleanDestinationAccount(
      transaction, settleId, transfer.destination, callback);
  }, callback);
}

/**
 * Removes any incoming Transaction entry for the given destination
 * FinancialAccount with a settle ID that is less than or equal to the
 * given settle ID.
 *
 * This method is called by workers that have been overridden when working on
 * Transactions that are in the 'processing' state. When a worker is
 * overridden in this situation, it might write erroneous incoming Transaction
 * entries to destination FinancialAccounts. While these entries are benign
 * with respect to financial integrity, they still need to be cleaned up to
 * ensure auditing is accurate and to sustain good Transaction processing
 * concurrency. This method is called to remove such entries. If an entry is
 * found with a settleId that is more recent than the given one, it is
 * ignored.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param dst the ID of the destination FinancialAccount.
 * @param callback(err) called once the operation completes.
 */
function _cleanDestinationAccount(transaction, settleId, dst, callback) {
  var transactionHash = payswarm.db.hash(transaction.id);
  var incoming = 'incoming.' + transactionHash;

  // remove any entry is that is <= settle ID
  var query = {id: payswarm.db.hash(dst)};
  query[incoming] = {$lte: settleId};
  var update = {$unset: {}};
  update.$unset[incoming] = true;
  payswarm.db.collections.account.update(
    query, update, payswarm.db.writeOptions, function(err) {
      callback(err);
    });
}

/**
 * Creates a worker ID.
 *
 * @return the worker ID.
 */
function _createWorkerId() {
  // generate worker ID
  var md = crypto.createHash('sha1');
  md.update((+new Date()).toString(), 'utf8');
  md.update(payswarm.tools.uuid());
  return md.digest('hex');
}

/**
 * Runs a settle or void worker.
 *
 * @param options the options to use:
 *          algorithm: the algorithm to run ('settle' or 'void').
 *          id: an optional Transaction ID to specifically work on.
 * @param callback(err) called once the operation completes.
 */
function _runWorker(options, callback) {
  // worker expiration is used to indicate when to forcibly override another
  // worker
  var now = +new Date();
  var expiration = payswarm.config.financial.transactionWorkerExpiration;
  var past = now - expiration;

  // get new worker ID
  var workerId = _createWorkerId();

  /* Note: A worker will attempt up to two update queries to mark a single
  transaction to be settled or voided. The first query will be for a specific
  Transaction (if an ID is given) or for any Transaction that isn't fully
  settled or voided yet and that has no other workers handling it. If no
  Transaction is marked by the first query and no specific Transaction ID was
  given, then the second query is attempted to mark a Transaction that has an
  expired worker on it. */

  // build queries to mark transactions
  var query;
  var expiredQuery = {};
  if(options.algorithm === 'settle') {
    /* To mark a transaction to be settled:
    1. The settleAfter date must be now or passed.
    2. The ID must match if a specific Transaction ID is given, otherwise
    3. There must be no assigned worker and a state of authorized, processing,
      or settling, OR
    4. There must be an expired worker and a state of authorized, processing,
      settling, or settled. */
    query = {'transaction.psaSettleAfter': {$lte: now}};
    if(options.id) {
      query.id = payswarm.db.hash(options.id);
    }
    else {
      query['workers.id'] = null,
      query.$or = [
        {state: SETTLE_STATE.AUTHORIZED},
        {state: SETTLE_STATE.PROCESSING},
        {state: SETTLE_STATE.SETTLING}
      ];
      expiredQuery = {
        'transaction.psaSettleAfter': {$lte: now},
        'workers.start': {$lte: past},
        $or: [
          {state: SETTLE_STATE.AUTHORIZED},
          {state: SETTLE_STATE.PROCESSING},
          {state: SETTLE_STATE.SETTLING},
          {state: SETTLE_STATE.SETTLED}
        ]
      };
    }
  }
  else if(options.algorithm === 'void') {
    /* To mark a transaction to be voided:
    1. The ID must match if a specific Transaction ID is given, otherwise
    2. The settleAfter date must be now or passed.
    3. The last update time must be in the past.
    4. There must be no assigned worker and a state of pending or voiding, OR
    5. There must be an expired worker and a state of pending, voiding,
      or voided.
    */
    if(options.id) {
      query = {id: payswarm.db.hash(options.id)};
    }
    else {
      query = {
        'transaction.psaSettleAfter': {$lte: now},
        'meta.updated': {$lte: past},
        'workers.id': null,
        $or: [
          {state: SETTLE_STATE.PENDING},
          {state: SETTLE_STATE.VOIDING}
        ]
      };
      expiredQuery = {
        'transaction.psaSettleAfter': {$lte: now},
        'meta.updated': {$lte: past},
        'workers.start': {$lte: past},
        $or: [
          {state: SETTLE_STATE.PENDING},
          {state: SETTLE_STATE.VOIDING},
          {state: SETTLE_STATE.VOIDED}
        ]
      };
    }
  }
  else {
    return callback(new PaySwarmError(
      'Invalid Transaction worker algorithm.',
      MODULE_TYPE + '.InvalidWorkerAlgorithm',
      {algorithm: options.algorithm}));
  }

  payswarm.logger.debug(
    'running transaction worker (' + workerId + ') ' +
    'to ' + options.algorithm + ' transaction' +
    (options.id ? (' ' + options.id) : 's') + '...');

  // single update and new record retrieval db write options
  var singleUpdate = payswarm.tools.extend(
    {}, payswarm.db.writeOptions, {upsert: false, multi: false});

  // run algorithm on all matching entries
  var done = false;
  async.until(function() {return done;}, function(callback) {
    async.waterfall([
      function(callback) {
        // mark a single txn at a time
        payswarm.db.collections.transaction.update(
          query, {
            // shouldn't happen, but ok to push duplicate worker IDs
            $push: {workers: {id: workerId, start: +new Date()}}
          }, singleUpdate, callback);
      },
      function(n, info, callback) {
        // skip running expired workers query if a non-expired txn was
        // marked or if a specific txn ID was provided
        if(n === 1 || options.id) {
          return callback(null, n, info);
        }

        // mark a single expired worker txn at a time
        payswarm.db.collections.transaction.update(
          expiredQuery, {
            // only updates the first occurrence of an expired worker -- if
            // there are more then they will be cleaned up later by another
            // worker, this is due to a current mongodb limitation
            $set: {'workers.$': {id: workerId, start: +new Date()}}
          }, singleUpdate, callback);
      },
      function(n, info, callback) {
        // no marked txn
        if(n === 0) {
          if(options.id) {
            // error when txn isn't found and a specific ID was given
            return callback(new PaySwarmError(
              'Could not ' + options.algorithm + ' Transaction; ' +
              'Transaction not found.',
              MODULE_TYPE + '.TransactionNotFound'));
          }

          // done iterating
          done = true;
          return callback(null, null);
        }
        // done iterating if working on one specific txn
        if(options.id) {
          done = true;
          return callback(null, {transaction: {id: options.id}});
        }

        // fetch transaction ID
        payswarm.db.collections.transaction.findOne(
          {'workers.id': workerId}, {'transaction.id': true}, callback);
      },
      function(record, callback) {
        if(!record) {
          return callback(null, null, null);
        }
        // handle marked txn
        var transactionId = record.transaction.id;
        if(options.algorithm === 'settle') {
          _processTransaction(transactionId, function(err) {
            // save override error
            var override = null;
            if(err && err.name === (MODULE_TYPE + '.TransactionOverridden')) {
              override = err;
              err = null;
            }
            // when doing batch (non-specific ID, ignore non-db errors)
            if(err && !options.id) {
              // FIXME: emit error event?
              if(payswarm.db.isDatabaseError(err)) {
                return callback(err);
              }
              err = null;
            }
            callback(err, transactionId, override);
          });
        }
        else if(options.algorithm === 'void') {
          api.voidTransaction(transactionId, function(err) {
            // when doing batch (non-specific ID, ignore non-db errors)
            if(err && !options.id) {
              // FIXME: emit error event?
              if(payswarm.db.isDatabaseError(err)) {
                return callback(err);
              }
              err = null;
            }
            callback(err, transactionId, null);
          });
        }
      },
      function(transactionId, override, callback) {
        if(!transactionId) {
          return callback();
        }
        // remove worker entry
        payswarm.db.collections.transaction.update(
          {id: payswarm.db.hash(transactionId)},
          {$pull: {workers: {id: workerId}}},
          payswarm.db.writeOptions, function(err) {
            // propagate override error
            if(!err && override) {
              err = override;
            }
            callback(err);
          });
      }
    ], callback);
  }, function(err) {
    if(err) {
      payswarm.logger.error(
        'error while trying to ' + options.algorithm + ' transaction', err);
    }
    payswarm.logger.debug('transaction worker (' + workerId + ') finished.');

    if(options.reschedule) {
      // reschedule worker if requested
      payswarm.logger.debug(
        'rescheduling transaction ' + options.algorithm + ' worker in ' +
        options.reschedule + ' ms');
      setTimeout(function() {
        var event = {details: {}};
        if(options.algorithm === 'settle') {
          event.type = EVENT_SETTLE;
        }
        else {
          event.type = EVENT_VOID;
        }
        payswarm.events.emit(event.type, event);
      }, options.reschedule);
    }
    if(callback) {
      callback(err);
    }
  });
}
