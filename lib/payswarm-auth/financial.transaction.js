/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
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
  permission: require('./permission'),
  profile: require('./profile'),
  resource: require('./resource'),
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
  TRANSACTION_ADMIN: MODULE_IRI + '#transaction_admin',
  TRANSACTION_ACCESS: MODULE_IRI + '#transaction_access',
  TRANSACTION_CREATE: MODULE_IRI + '#transaction_create'
};
payswarm.financial.PERMISSIONS = PERMISSIONS;

var SETTLE_STATE = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  PROCESSING: 'processing',
  SETTLING: 'settling',
  SETTLED: 'settled',
  VOIDING: 'voiding',
  VOIDED: 'voided'
};

var EVENT_SETTLE = 'common.Transaction.settle';
var EVENT_SETTLED = 'common.Transaction.settled';
var EVENT_VOID = 'common.Transaction.void';
var EVENT_VOIDED = 'common.Transaction.voided';

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
      payswarm.db.openCollections(['account', 'transaction'], callback);
    },
    function(callback) {
      /* Note: Many of the combined indexes below have 'id' as their last
      field because this enables faster paging of results. MongoDB's skip()
      method must walk the entire result set and is slow. Therefore, we do
      ranged queries that require a being able to provide a min() key on
      an index that uniquely matches the last record from the previous result
      set. */

      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        // ID
        collection: 'transaction',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        // assetAcquirer+asset+counter
        collection: 'transaction',
        fields: {assetAcquirer: 1, asset: 1, counter: 1},
        options: {unique: true, background: true}
      }, {
        // assetAcquirer+asset+referenceId
        collection: 'transaction',
        fields: {assetAcquirer: 1, asset: 1, referenceId: 1},
        options: {unique: true, background: true}
      }, {
        // asset+assetAcquirer+id
        collection: 'transaction',
        fields: {asset: 1, assetAcquirer: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        // asset+date+id
        collection: 'transaction',
        fields: {asset: 1, created: -1, id: 1},
        options: {unique: true, background: true}
      }, {
        // identities+date+id
        collection: 'transaction',
        fields: {identities: 1, created: -1, id: 1},
        options: {unique: true, background: true}
      }, {
        // source+date+id
        collection: 'transaction',
        fields: {source: 1, created: -1, id: 1},
        options: {unique: true, background: true}
      }, {
        // destination+date+id
        collection: 'transaction',
        fields: {destination: 1, created: -1, id: 1},
        options: {unique: true, background: true}
      }, {
        // accounts+date+id
        collection: 'transaction',
        fields: {accounts: 1, created: -1, id: 1},
        options: {unique: true, background: true}
      }, {
        // date+id
        collection: 'transaction',
        fields: {created: -1, id: 1},
        options: {unique: true, background: true}
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
      // add listener for settle events
      payswarm.events.on(EVENT_SETTLE, function(event) {
        payswarm.logger.debug('got settle event', event);
        var options = {algorithm: 'settle'};
        if(event && event.details && event.details.transactionId) {
          options.id = event.details.transactionId;
        }
        else {
          options.reschedule =
            payswarm.config.financial.transaction.worker.schedule;
        }
        process.nextTick(function() {_runWorker(options);});
      });
      // add listener for void events
      payswarm.events.on(EVENT_VOID, function(event) {
        payswarm.logger.debug('got void event', event);
        if(event && event.details) {
          var options = {algorithm: 'void'};
          if(event.details.voidReason) {
            options.voidReason = event.details.voidReason;
          }
          if(event.details.transactionId) {
            options.id = event.details.transactionId;
          }
          else {
            options.reschedule =
              payswarm.config.financial.transaction.worker.schedule;
          }

          process.nextTick(function() {_runWorker(options);});
        }
      });

      // run workers
      payswarm.events.emit({
        type: EVENT_SETTLE,
        details: {}
      });
      payswarm.events.emit({
        type: EVENT_VOID,
        details: {}
      });
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
 * Creates a Transaction ID from the given ID.
 *
 * @param id the last segment in a Transaction ID.
 *
 * @return the Transaction ID.
 */
api.createTransactionId = function(id) {
  return util.format('%s/transactions/%s',
    payswarm.config.authority.baseUri, encodeURIComponent(id));
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

  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
  var isWithdrawal = jsonld.hasValue(transaction, 'type', 'Withdrawal');

  async.waterfall([
    // 0. Do preliminary check for insufficient funds
    function(callback) {
      // skip lookup on deposit from external account
      if(isDeposit) {
        return callback();
      }
      // TODO: Note: This entire transaction backend supports multiple
      // sources in the transaction; we only need to change the code in a
      // few places (where it handles the source) to use loops instead of
      // a single source. All of the atomic checks, etc. should continue
      // to function just the same, even with hard failures (crashes).
      var transfers = jsonld.getValues(transaction, 'transfer');
      var src = transfers[0].source;
      // lookup local account
      payswarm.db.collections.account.findOne(
        {id: payswarm.db.hash(src)},
        {'account.balance': true}, function(err, record) {
          if(err) {
            return callback(err);
          }
          if(record === null) {
            return callback(new PaySwarmError(
              'Could not authorize Transaction; invalid source ' +
              'FinancialAccount.',
              MODULE_TYPE + '.FinancialAccountNotFound', {
                httpStatusCode: 400,
                'public': true,
                account: src
              }));
          }
          var balance = new Money(record.account.balance);
          var amount = new Money(transaction.amount);
          if(balance.compareTo(amount) < 0) {
            return callback(new PaySwarmError(
              'Could not authorize Transaction; insufficient funds in the ' +
              'source FinancialAccount.',
              MODULE_TYPE + '.InsufficientFunds', {
                httpStatusCode: 400,
                'public': true,
                account: src
              }));
          }
          callback();
        });
    },
    // 1. Insert pending transaction record.
    function(callback) {
      _insertTransaction(transaction, duplicateQuery, callback);
    },
    // 2. Ensure each dst FA is valid and can receive funds from src FA.
    function(callback) {
      // gather unique non-external destination account IDs
      var accounts = {};
      transaction.transfer.forEach(function(transfer) {
        if(!(isWithdrawal &&
          transfer.destination === transaction.destination.id)) {
          accounts[payswarm.db.hash(transfer.destination)] =
            transfer.destination;
        }
      });
      // while checking dst FAs, gather all dst identities
      var dstHashes = Object.keys(accounts);
      var identities = [];
      payswarm.db.collections.account.find(
        {id: {$in: dstHashes}}, {id: true, owner: true}).toArray(
        function(err, records) {
          if(!err) {
            // ensure all IDs were found
            var valid = _.map(records, function(record) {return record.id;});
            if(valid.length !== dstHashes.length) {
              var diff = _.difference(dstHashes, valid);
              var missing = _.map(diff, function(dst) {return accounts[dst];});
              err = new PaySwarmError(
                'Could not authorize Transaction; invalid destination ' +
                'FinancialAccount.',
                MODULE_TYPE + '.FinancialAccountNotFound', {
                  httpStatusCode: 400,
                  'public': true,
                  accounts: missing
                });
            }
          }
          if(!err) {
            identities = _.uniq(
              _.map(records, function(record) {return record.owner;}));
          }
          callback(err, identities);
        });
    },
    // 3-7. Update src balance and authorize transaction.
    function(identities, callback) {
      _authorizeTransaction(transaction, identities, callback);
    },
    function(callback) {
      var now = +new Date();
      if(now >= transaction.psaSettleAfter) {
        // fire an event to settle the transaction
        payswarm.events.emit({
          type: EVENT_SETTLE,
          details: {transactionId: transaction.id}
        });
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
 * @param options the void options:
 *          voidReason: the reason for voiding the transaction.
 * @param callback(err) called once the operation completes.
 */
api.voidTransaction = function(transactionId, options, callback) {
  payswarm.logger.debug('voiding transaction', transactionId);
  options = options || {voidReason: MODULE_TYPE + '.Voided'};
  var transactionHash = payswarm.db.hash(transactionId);
  async.waterfall([
    // 1. Update transaction if it is 'pending' or 'authorized'.
    function(callback) {
      var update = {
        $set: {
          state: SETTLE_STATE.VOIDING,
          'transaction.voided': payswarm.tools.w3cDate(),
          'transaction.voidReason': options.voidReason,
          'meta.updated': +new Date()
        }
      };
      payswarm.db.collections.transaction.update(
        {id: transactionHash, $or: [
          {state: SETTLE_STATE.PENDING},
          {state: SETTLE_STATE.AUTHORIZED}]},
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

      // touch transaction if state was voiding
      if(!err && record.state === SETTLE_STATE.VOIDING) {
        return payswarm.db.collections.transaction.update(
          {id: transactionHash, state: SETTLE_STATE.VOIDING},
          {$set: {'meta.updated': +new Date()}}, payswarm.db.writeOptions,
          function(err) {
            callback(err, record);
          });
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
 * @param [flags] optimization flags (eg: 'isParticipant').
 * @param callback(err, records) called once the operation completes.
 */
api.getTransactions = function(actor, query, fields, options, flags, callback) {
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
  else if(typeof flags === 'function') {
    callback = flags;
    flags = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  flags = flags || {};
  async.waterfall([
    function(callback) {
      payswarm.db.collections.transaction.find(
        query, fields, options).toArray(callback);
    },
    function(records, callback) {
      // do in series to preserve record order
      var rel = {};
      var cleanedRecords = [];
      async.forEachSeries(records, function(record, callback) {
        var txn = record.transaction;
        if(txn) {
          // remove restricted fields
          delete txn.psaSettleAfter;

          // restore full @context
          txn['@context'] = payswarm.tools.getDefaultJsonLdContext();
        }
        else {
          // no transaction data requested, return record
          // (done for simple existence check)
          cleanedRecords.push(record);
          return callback();
        }

        async.waterfall([
          function(callback) {
            // check to make sure the caller is allowed to access the
            // transaction
            rel.isParticipant = flags.isParticipant || false;
            payswarm.profile.checkActorPermissionForObject(
              actor, txn,
              PERMISSIONS.TRANSACTION_ADMIN, PERMISSIONS.TRANSACTION_ACCESS,
              _checkTransactionAccess(rel), function(err) {
                if(!err) {
                  cleanedRecords.push(record);
                }
                callback();
              });
          },
          function(callback) {
            if(!rel.isVendor && 'vendor' in txn) {
              // hide vendor address
              delete txn.vendor.address;
            }
            if(!rel.isAssetAcquirer && 'assetAcquirer' in txn) {
              // hide asset acquirer address
              delete txn.assetAcquirer.address;
            }
            // hide deposit source information
            if(!rel.isSourceOwner &&
              jsonld.hasValue(txn, 'type', 'Deposit') &&
              typeof txn.source === 'object') {
              txn.source = {
                id: txn.source.id,
                type: txn.source.type,
                label: txn.source.label
              };
            }
            // hide withdrawal destination information
            if(!rel.isDestinationOwner &&
              jsonld.hasValue(txn, 'type', 'Withdrawal') &&
              typeof txn.destination === 'object') {
              txn.destination = {
                id: txn.destination.id,
                label: txn.destination.label || ''
              };
            }
            callback();
          }
        ], callback);
      }, function(err) {
        if(err) {
          return callback(err);
        }

        // do in parallel
        async.forEach(cleanedRecords, function(record, callback) {
          var txn = record.transaction;

          // no extra data to fetch for non-contracts
          if(!txn || !jsonld.hasValue(txn, 'type', 'Contract')) {
            return callback();
          }

          // get asset/license/listing info
          async.auto({
            getAsset: function(callback) {
              payswarm.resource.asset.get({
                id: txn.asset,
                hash: txn.assetHash,
                type: 'Asset',
                store: false,
                strict: true,
                fetch: false
              }, callback);
            },
            getLicense: function(callback) {
              payswarm.resource.license.get({
                id: txn.license,
                hash: txn.licenseHash,
                type: 'License',
                store: false,
                strict: true,
                fetch: false
              }, callback);
            },
            getListing: function(callback) {
              payswarm.resource.listing.get({
                id: txn.listing,
                hash: txn.listingHash,
                type: 'Listing',
                store: false,
                strict: true,
                fetch: false
              }, callback);
            }
          }, function(err, results) {
            if(err) {
              return callback(err);
            }
            txn.asset = results.getAsset[0].resource;
            txn.license = results.getLicense[0].resource;
            txn.listing = results.getListing[0].resource;
            delete txn.asset['@context'];
            delete txn.license['@context'];
            delete txn.listing['@context'];
            delete txn.assetHash;
            delete txn.licenseHash;
            callback();
          });
        }, function(err) {
          callback(err, cleanedRecords);
        });
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
        actor, {id: payswarm.db.hash(id)},
        {transaction: true, meta: true}, {limit: 1}, callback);
    },
    function(records, callback) {
      if(records.length === 0) {
        return callback(new PaySwarmError(
          'Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound',
          {'public': true, httpStatusCode: 404, id: id}));
      }
      callback(null, records[0].transaction, records[0].meta);
    }
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
  transfers.forEach(function(transfer) {
    dsts.push(payswarm.db.hash(transfer.destination));
  });

  // always run duplicate check against transaction ID
  var idDuplicateQuery = {id: payswarm.db.hash(transaction.id)};
  if(duplicateQuery) {
    duplicateQuery = {$or: [idDuplicateQuery, duplicateQuery]};
  }
  else {
    duplicateQuery = idDuplicateQuery;
  }

  async.waterfall([
    function(callback) {
      _getTransactionIdentityAndAsset(transaction, callback);
    },
    function(identityId, assetId, callback) {
      var txnIdHash = payswarm.db.hash(transaction.id);
      var identityIdHash = payswarm.db.hash(identityId);
      var assetIdHash = payswarm.db.hash(assetId);
      var referenceIdHash = payswarm.db.hash(transaction.referenceId);
      var isContract = jsonld.hasValue(transaction, 'type', 'Contract');

      // keep trying to insert while checking for duplicates
      var counter = 0;
      var inserted = false;
      async.until(function() {return inserted;}, function(callback) {
        async.waterfall([
          function(callback) {
            // get the last assetAcquirer+asset counter (note that for
            // non-contracts there will never be an existing count since the
            // asset ID is forced to be the transaction ID which is always
            // unique)
            if(!isContract) {
              return callback();
            }
            payswarm.db.collections.transaction.find(
              {assetAcquirer: identityIdHash, asset: assetIdHash},
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
            // always do this, even for non-contracts, the duplicate
            // check will ensure a txn ID isn't repeated
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
                      transactionId: record.transaction.id,
                      query: duplicateQuery
                    }));
                }
                callback();
              });
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
            if(isContract) {
              txn.asset = txn.asset.id;
              txn.assetHash = txn.listing.assetHash;
              txn.license = txn.license.id;
              txn.licenseHash = txn.listing.licenseHash;
              txn.listing = txn.listing.id;
            }

            // create record
            var now = +new Date();
            var record = {
              id: txnIdHash,
              state: SETTLE_STATE.PENDING,
              settleId: 0,
              // must be an array or else rare case of duplicate worker IDs
              // plus a crash will result in an expired worker never being
              // cleaned up
              workers: [],
              created: new Date(transaction.created),
              // hacked to be txn ID for non-contracts
              asset: assetIdHash,
              // hacked to be txn source owner for non-contracts
              assetAcquirer: identityIdHash,
              // all identities involved (dst IDs populated at authorization)
              identities: [identityIdHash],
              counter: counter,
              referenceId: referenceIdHash,
              source: src,
              destination: _.uniq(dsts),
              accounts: _.uniq([src].concat(dsts)),
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

      // use source owner for a deposit
      if(jsonld.hasValue(transaction, 'type', 'Deposit')) {
        if(!transaction.source.owner) {
          return callback(new PaySwarmError(
            'Could not determine Deposit source\'s identity; invalid ' +
            'Deposit format.', MODULE_TYPE + '.InvalidTransaction',
            {transaction: transaction}));
        }
        return callback(null, transaction.source.owner);
      }

      // get identity ID via source financial account
      var transfers = jsonld.getValues(transaction, 'transfer');
      if(transfers.length === 0) {
        return callback(new PaySwarmError(
          'Could not determine Transaction source\'s identity; invalid ' +
          'Transaction format.', MODULE_TYPE + '.InvalidTransaction',
          {transaction: transaction}));
      }
      var account = transfers[0].source;

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
 * @param identities an array of destination identity ID hashes to add
 *          to the transaction for indexing.
 * @param callback(err) called once the operation completes.
 */
function _authorizeTransaction(transaction, identities, callback) {
  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
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
        // fire event to void transaction
        payswarm.events.emit({
          type: EVENT_VOID,
          details: {
            transactionId: transaction.id,
            voidReason: MODULE_TYPE + '.InsufficientFunds'
          }
        });

        return callback(new PaySwarmError(
          'Could not authorize Transaction; insufficient funds in the ' +
          'source FinancialAccount.',
          MODULE_TYPE + '.InsufficientFunds', {
            httpStatusCode: 400,
            'public': true,
            transactionId: transaction.id,
            account: src
          }));
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
        return _authorizeTransaction(transaction, identities, callback);
      }
      cb();
    },
    // account balance updated, set transaction state
    function(callback) {
      payswarm.db.collections.transaction.update(
        {id: transactionHash, state: SETTLE_STATE.PENDING},
        {
          $set: {
            state: SETTLE_STATE.AUTHORIZED,
            'meta.updated': +new Date(),
            'transaction.authorized': payswarm.tools.w3cDate()
          },
          // add destination identities to index
          $addToSet: {
            identities: {$each: identities}
          }
        },
        payswarm.db.writeOptions, callback);
    },
    // raise an error if transaction was not authorized
    function(n, info, callback) {
      if(n === 0) {
        // fire event to void transaction
        var event = {
          type: EVENT_VOID,
          details: {transactionId: transaction.id}
        };
        payswarm.events.emit(event);
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
  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
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
    },
    // fire event
    function(callback) {
      // may fire multiple times
      payswarm.events.emit({
        type: EVENT_VOIDED,
        details: {transaction: transaction}
      });
      callback();
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
    // get transaction
    function(callback) {
      // FIXME: could probably pull out only a portion of the txn here
      // or pass it to the subsequent calls to optimize a bit
      payswarm.db.collections.transaction.findOne(
        {id: transactionHash}, {transaction: true},
        callback);
    },
    // check external payment gateway for deposits and withdrawals
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not process Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound'));
      }
      var transaction = record.transaction;
      var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
      var isWithdrawal = jsonld.hasValue(transaction, 'type', 'Withdrawal');
      if(isDeposit || isWithdrawal) {
        return _checkExternalTransactionStatus(transaction, callback);
      }
      callback();
    },
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
}

/**
 * Returns a callback that determines if the given transaction should be
 * accessible to the provided actor and specifies how the actor is
 * related to the transaction in the given relationship object.
 *
 * @param rel the relationship object to populate.
 *
 * @return a transaction access checker callback.
 */
function _checkTransactionAccess(rel) {
  rel = rel || {};
  return function(actor, txn, callback) {
    // FIXME: allow reads of the transaction if the actor was involved in
    // a source or destination payment, but ensure to clean the transaction
    // such that only transfers that the actor was involved in are shown
    async.auto({
      // FIXME: future optimization: instead of getting all identities for a
      // profile, consider only looking up the 'owner' property for identities
      // found in the contract
      getIdentities: function(callback) {
        // use cached identities in rel
        if(rel.identities) {
          return callback(null, rel.identities);
        }
        payswarm.identity.getProfileIdentities(actor, actor.id,
          function(err, records) {
            rel.identities = records;
            callback(err, records);
        });
      },
      isAssetAcquirer: ['getIdentities', function(callback, results) {
        rel.isAssetAcquirer = false;
        var records = results.getIdentities;

        // check to see if any of the identities is the asset acquirer
        if(txn.assetAcquirer) {
          var acquirer = txn.assetAcquirer.id;
          rel.isAssetAcquirer = _idMatchExists(acquirer, records, 'identity');
        }
        callback();
      }],
      isAssetProvider: ['getIdentities', function(callback, results) {
        rel.isAssetProvider = false;
        var records = results.getIdentities;

        // check to see if any of the identities is the asset provider
        if(txn.assetProvider) {
          var provider = txn.assetProvider.id;
          rel.isAssetProvider = _idMatchExists(provider, records, 'identity');
        }
        callback();
      }],
      isVendor: ['getIdentities', function(callback, results) {
        rel.isVendor = false;
        var records = results.getIdentities;

        // check to see if any of the identities is the vendor
        if(txn.vendor) {
          var vendor = txn.vendor.id;
          rel.isVendor = _idMatchExists(vendor, records, 'identity');
        }
        callback();
      }],
      isSourceOwner: ['getIdentities', function(callback, results) {
        rel.isSourceOwner = false;
        var records = results.getIdentities;

        // check to see if any of the identities is the source owner
        if(txn.source && txn.source.owner) {
          var sourceOwner = txn.source.owner;
          rel.isSourceOwner = _idMatchExists(sourceOwner, records, 'identity');
        }
        callback();
      }],
      isDestinationOwner: ['getIdentities', function(callback, results) {
        rel.isDestinationOwner = false;
        var records = results.getIdentities;

        // check to see if any of the identities is the destination owner
        if(txn.destination && txn.destination.owner) {
          var destinationOwner = txn.destination.owner;
          rel.isDestinationOwner = _idMatchExists(
            destinationOwner, records, 'identity');
        }
        callback();
      }],
      isParticipant: ['isAssetAcquirer', 'isAssetProvider', 'isVendor',
        'isSourceOwner', 'isDestinationOwner', function(callback, results) {
        // use preset value, if available
        if(rel.isParticipant) {
          return callback();
        }
        rel.isParticipant = (rel.isAssetAcquirer || rel.isAssetProvider ||
          rel.isVendor || rel.isSourceOwner || rel.isDestinationOwner);
        if(rel.isParticipant) {
          return callback();
        }
        // use identities index as fastest last resort to determine
        // if identity is a participant
        var identities = [];
        var records = results.getIdentities;
        records.forEach(function(record) {
          identities.push(record.id);
        });
        payswarm.db.collections.transaction.findOne(
          {id: payswarm.db.hash(txn.id), identities: {$in: identities}},
          {id: true},
          function(err, record) {
            if(!err && record) {
              rel.isParticipant = true;
            }
            callback(err);
          });
      }]
    }, function(err) {
      callback(err, rel.isParticipant);
    });
  };
}

/**
 * Checks to see if a given ID matches the ID of an entry in 'records' given a
 * 'key' (e.g. for record in records { if id === record[key].id return true; })
 *
 * @param id the identifier to check against each specified entry in records.
 * @param records the list of records to search for an answer.
 *
 * @return true if a record match exists, false otherwise.
 */
function _idMatchExists(id, records, key) {
  var match = false;
  for(var i = 0; !match && i < records.length; ++i) {
    var item = records[i][key];
    if(item.id === id) {
      match = true;
    }
  }
  return match;
}

/**
 * Determines if a Deposit or Withdrawal is ready to be settled by ensuring
 * any related monetary transactions performed by an external payment gateway
 * have reached an acceptable state. The acceptable state can vary by at least
 * the type of payment source or destination. For instance, if a Deposit's
 * payment source was a credit card (or a tokenized credit card), then the
 * Deposit is automatically considered settleable. If the payment source or
 * destination of the Transaction is a bank account, an inquiry into a pending
 * ACH transaction's state may need to be made.
 *
 * @param transaction the Transaction (Deposit/Withdrawal) to process.
 * @param callback(err) called once the operation completes.
 */
function _checkExternalTransactionStatus(transaction, callback) {
  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
  var account = isDeposit ? transaction.source : transaction.destination;
  var isBankAccount = (
    jsonld.hasValue(account, 'type', 'BankAccount') ||
    jsonld.hasValue(account, 'paymentMethod', 'BankAccount'));
  if(!isBankAccount) {
    // nothing to do for non-bank accounts
    return callback();
  }

  // verify payment gateway
  var gateway = account.paymentGateway;
  if(!(gateway in payswarm.financial.paymentGateways)) {
    return callback(new PaySwarmError(
      'Invalid payment gateway.',
      MODULE_TYPE + '.InvalidPaymentGateway',
      {paymentGateway: gateway}));
  }
  gateway = payswarm.financial.paymentGateways[gateway];

  async.waterfall([
    function(callback) {
      // if transaction has psaExternalStatus set on it, use it as an
      // override
      if('psaExternalStatus' in transaction) {
        return callback(null, {status: transaction.psaExternalStatus});
      }

      // if # of status checks exceeded, issue critical warning
      if(transaction.psaExternalStatusChecks >=
        payswarm.config.financial.transaction.maxExternalStatusChecks) {
        var err = new PaySwarmError(
          'Maximum number of status checks exceeded for transaction "' +
          transaction.id + '", intervention required to reset ' +
          '"psaExternalStatusChecks" once the transaction has been ' +
          'settled via the payment gateway.',
          MODULE_TYPE + '.MaximumTransactionStatusChecksExceeded',
          {transactionId: transaction.id});
        payswarm.events.emit({
          type: 'common.Transaction.statusChecksExceeded',
          details: {transactionId: transaction.id}
        });
        payswarm.logger.warning(err.message, err);
        return callback(null, null);
      }

      /* Note: Multiple workers could run this code at the same time resulting
      in a double-charge for running an inquiry via a payment gateway (whatever
      that charge amount is). However, this should only happen in very rare
      corner cases where a worker has stalled longer than its expiration time
      and then is overridden by another one. */
      gateway.getTransactionStatus(transaction, function(err, result) {
        // continue even in error case
        if(err) {
          // create error result
          if(result === undefined) {
            result = {status: 'error'};
          }
        }
        callback(null, result);
      });
    },
    function(result, callback) {
      var inc = {};
      if(result && !('psaExternalStatus' in transaction)) {
        // increment number of status checks on txn (if not overridden)
        inc['transaction.psaExternalStatusChecks'] = 1;
      }

      // no result or external txn still pending or error
      if(!result || result.status === 'pending' || result.status === 'error') {
        // increment settleAfter according to config
        inc['transaction.psaSettleAfter'] =
          payswarm.config.financial.transaction.statusSettleAfterIncrement;
      }

      // only update if transaction is still in authorized state
      payswarm.db.collections.transaction.update(
        {
          id: payswarm.db.hash(transaction.id),
          state: SETTLE_STATE.AUTHORIZED
        }, {
          $inc: inc,
          $set: {'meta.updated': +new Date()}
        },
        payswarm.db.writeOptions, function(err) {
          callback(err, result);
        });
    },
    function(result, callback) {
      // external txn settled
      if(result && result.status === 'settled') {
        return callback();
      }

      // external txn still pending
      if(!result || result.status === 'pending') {
        return callback(new PaySwarmError(
          'The associated external transaction is still pending.',
          MODULE_TYPE + '.ExternalTransactionPending',
          {transactionId: transaction.id}));
      }

      // external txn voided
      if(result && result.status === 'voided') {
        // fire an event to void the transaction
        payswarm.events.emit({
          type: EVENT_VOID,
          details: {transactionId: transaction.id}
        });
        return callback(new PaySwarmError(
          'The associated external transaction has been voided.',
          MODULE_TYPE + '.ExternalTransactionVoided',
          {transactionId: transaction.id}));
      }

      // result status must be 'error'
      var details = {
        transactionId: transaction.id
      };
      var err = new PaySwarmError(
        'The payment gateway returned an error during a transaction ' +
        'status check.', MODULE_TYPE + '.PaymentGatewayError',
        details);
      payswarm.events.emit({
        type: 'common.Transaction.statusCheckError',
        details: details
      });
      payswarm.logger.warning(err.message, err);

      callback(err);
    }
  ], callback);
}

/**
 * Atomically adds the incoming Transaction entries to destination
 * FinancialAccounts. The Transaction is marked as settling on success.
 *
 * @param transaction the Transaction.
 * @param settleId the Transaction settle ID.
 * @param callback(err, record) called once the operation completes.
 */
function _addIncomingEntries(transaction, settleId, callback) {
  var isWithdrawal = jsonld.hasValue(transaction, 'type', 'Withdrawal');
  var transactionHash = payswarm.db.hash(transaction.id);
  var incoming = 'incoming.' + transactionHash;

  // get unique destination accounts
  var transfers = jsonld.getValues(transaction, 'transfer');
  var accounts = {};
  transfers.forEach(function(transfer) {
    if(!(isWithdrawal &&
      transfer.destination === transaction.destination.id)) {
      accounts[transfer.destination] = true;
    }
  });

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
  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
  var isWithdrawal = jsonld.hasValue(transaction, 'type', 'Withdrawal');
  var transactionHash = payswarm.db.hash(transaction.id);
  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;

  // calculate total amounts for each destination account
  var accounts = {};
  transaction.transfer.forEach(function(transfer) {
    var dst = transfer.destination;
    // skip external destinations
    if(!(isWithdrawal && dst === transaction.destination.id)) {
      var amount = new Money(transfer.amount);
      accounts[dst] = (dst in accounts) ? accounts[dst].add(amount) : amount;
    }
  });

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
      var now = new Date();
      var settled = payswarm.tools.w3cDate(now);
      payswarm.db.collections.transaction.update(
        {id: transactionHash, state: SETTLE_STATE.SETTLING},
        {$set: {
          state: SETTLE_STATE.SETTLED,
          'transaction.settled': settled,
          'meta.updated': +now}},
        payswarm.db.writeOptions, function(err, n, info) {
          callback(err, settled, n, info);
        });
    },
    // if no update, get FT's state.
    function(settled, n, info, callback) {
      if(n === 0) {
        return payswarm.db.collections.transaction.findOne(
          {id: transactionHash}, {
            state: true,
            'transaction.settled': true
          }, callback);
      }
      callback(null, {
        state: SETTLE_STATE.SETTLED,
        transaction: {
          settled: settled
        }
      });
    },
    // if state is 'settled', finish, otherwise error
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Could not settle Transaction; Transaction not found.',
          MODULE_TYPE + '.TransactionNotFound'));
      }
      if(record.state === SETTLE_STATE.SETTLED) {
        // update settled field in local transaction object
        transaction.settled = record.transaction.settled;
        payswarm.events.emit({
          type: EVENT_SETTLED,
          details: {transaction: transaction}
        });
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
      var fields = {
        updateId: true,
        'account.balance': true
      };
      fields[incoming] = true;
      payswarm.db.collections.account.findOne(
        query, fields, callback);
    },
    function(record, callback) {
      if(!record) {
        // account already updated, proceed
        return callback(null, 1, null);
      }

      // remove entry and quit early if less than settle ID
      if(record.incoming[transactionHash] < settleId) {
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
 *          voidReason: the reason why the Transaction is being voided.
 * @param callback(err) called once the operation completes.
 */
function _runWorker(options, callback) {
  // worker expiration is used to indicate when to forcibly override another
  // worker
  var now = +new Date();
  var expiration = payswarm.config.financial.transaction.worker.expiration;
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
    (options.id ? (' "' + options.id + '"') : 's') + '...');

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
            // worker, this is due to a current mongodb limitation, we
            // would prefer to pull all expired workers and push the new
            // worker instead (also, we update the individual properties
            // instead of setting a new object to avoid a mongodb bug with
            // index corruption)
            $set: {'workers.$.id': workerId, 'workers.$.start': +new Date()}
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
            // save non-db error
            var savedError = null;
            if(err && !payswarm.db.isDatabaseError(err)) {
              savedError = err;
              err = null;
            }
            callback(err, transactionId, savedError);
          });
        }
        else if(options.algorithm === 'void') {
          var opts = {
            voidReason: options.voidReason || (MODULE_TYPE + '.Expired')
          };
          api.voidTransaction(transactionId, opts, function(err) {
            // save non-db error
            var savedError = null;
            if(err && !payswarm.db.isDatabaseError(err)) {
              savedError = err;
              err = null;
            }
            callback(err, transactionId, savedError);
          });
        }
      },
      function(transactionId, savedError, callback) {
        if(!transactionId) {
          return callback();
        }
        // remove worker entry
        payswarm.db.collections.transaction.update(
          {id: payswarm.db.hash(transactionId)},
          {$pull: {workers: {id: workerId}}},
          payswarm.db.writeOptions, function(err) {
            // propagate saved error
            if(!err && savedError) {
              err = savedError;
            }
            // when doing batch (non-specific ID, ignore non-db errors)
            if(err && !options.id && !payswarm.db.isDatabaseError(err)) {
              // FIXME: emit event if we find this logging critical errors
              payswarm.logger.error(
                'transaction worker (' + workerId + ') encountered a ' +
                'non-database error while processing non-ID-specific ' +
                'transactions', err);
              err = null;
            }
            callback(err);
          });
      }
    ], function(err) {
      // prevent stack overflow
      process.nextTick(function() {
        callback(err);
      });
    });
  }, function(err) {
    if(err) {
      payswarm.logger.error(
        'error while trying to ' + options.algorithm + ' transaction',
        {error: err});
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
        payswarm.events.emit(event);
      }, options.reschedule);
    }
    if(callback) {
      callback(err);
    }
  });
}

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    id: PERMISSIONS.TRANSACTION_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Transaction Administration',
    comment: 'Required to administer Transactions.'
  }, {
    id: PERMISSIONS.TRANSACTION_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Transaction',
    comment: 'Required to access a Transaction.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
