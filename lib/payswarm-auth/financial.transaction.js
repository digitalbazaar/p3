/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var crypto = require('crypto');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  constants: bedrock.config.constants,
  financial: require('./financial'),
  logger: bedrock.loggers.get('app'),
  resource: require('./resource'),
  security: require('./security'),
  tools: require('./tools')
};
var util = require('util');
var BigNumber = require('bignumber.js');
var BedrockError = payswarm.tools.BedrockError;
var Money = require('./money').Money;

// constants
var MODULE_NS = payswarm.financial.namespace;

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

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

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      // open all necessary collections
      brDatabase.openCollections(['account', 'transaction'], callback);
    },
    function(callback) {
      /* Note: Many of the combined indexes below have 'id' as their last
      field because this enables faster paging of results. MongoDB's skip()
      method must walk the entire result set and is slow. Therefore, we do
      ranged queries that require being able to provide a min() key on
      an index that uniquely matches the last record from the previous result
      set. */

      // setup collections (create indexes, etc)
      brDatabase.createIndexes([{
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
        fields: {state: 1, 'transaction.sysSettleAfter': 1, 'workers.id': 1},
        options: {unique: false, background: true}
      }, {
        // TODO: combine worker ID w/time to reduce index size? see
        // financial.accounts.js worker ID implementation
        // workers.start+settleAfter+state
        collection: 'transaction',
        fields: {'workers.start': 1, 'transaction.sysSettleAfter': 1, state: 1},
        options: {unique: false, background: true}
      }], callback);
    },
    function(callback) {
      brDatabase.getDistributedIdGenerator('transaction',
        function(err, idGenerator) {
          if(!err) {
            transactionIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
});

bedrock.events.on('bedrock.start', function(callback) {
  // run workers
  bedrock.events.emitLater({
    type: EVENT_SETTLE,
    details: {}
  });
  bedrock.events.emitLater({
    type: EVENT_VOID,
    details: {}
  });
  callback();
});

// add listener for settle events
bedrock.events.on(EVENT_SETTLE, function(event) {
  payswarm.logger.verbose('got settle event', event);
  var options = {algorithm: 'settle'};
  if(event && event.details && event.details.transactionId) {
    options.id = event.details.transactionId;
  } else {
    options.reschedule =
      bedrock.config.financial.transaction.worker.schedule;
  }
  process.nextTick(function() {_runWorker(options);});
});

// add listener for void events
bedrock.events.on(EVENT_VOID, function(event) {
  payswarm.logger.verbose('got void event', event);
  if(event && event.details) {
    var options = {algorithm: 'void'};
    if(event.details.voidReason) {
      options.voidReason = event.details.voidReason;
    }
    if(event.details.transactionId) {
      options.id = event.details.transactionId;
    } else {
      options.reschedule =
        bedrock.config.financial.transaction.worker.schedule;
    }

    process.nextTick(function() {_runWorker(options);});
  }
});

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
      bedrock.config.authority.baseUri, id);
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
    bedrock.config.authority.baseUri, encodeURIComponent(id));
};

/**
 * Authorizes the given Transaction.
 *
 * @param transaction the Transaction.
 * @param options the authorization options:
 *          [duplicateQuery] an optional query to use for checking for
 *            duplicates (default: no duplicate check).
 * @param callback(err) called once the operation completes.
 */
api.authorizeTransaction = function(transaction, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  var duplicateQuery = options.duplicateQuery || null;

  // transaction has no assigned reference ID
  if(!('referenceId' in transaction)) {
    // use payswarm prefix + transaction ID
    transaction.referenceId = 'payswarm.' + transaction.id;
  }
  // if the transaction has no settleAfter date set, set it to now
  if(!('sysSettleAfter' in transaction)) {
    transaction.sysSettleAfter = +new Date();
  }

  // store full triggered node (if given)
  var triggered = transaction.triggered || null;
  if(triggered) {
    // check triggered transaction
    var isContract = jsonld.hasValue(transaction, 'type', 'Contract');
    if(!isContract) {
      return callback(new BedrockError(
        'Only Contracts can trigger other Transactions.',
        MODULE_NS + '.InvalidTransactionType', {
          httpStatusCode: 400,
          'public': true,
          transactionId: transaction.id
        }));
    }
    var isTriggeredDeposit = jsonld.hasValue(triggered, 'type', 'Deposit');
    if(!isTriggeredDeposit) {
      return callback(new BedrockError(
        'Contracts may only trigger Deposit Transactions.',
        MODULE_NS + '.InvalidTriggeredTransactionType', {
          httpStatusCode: 400,
          'public': true,
          transactionId: transaction.id
        }));
    }
    // deposit must be marked as triggered by the contract
    if(triggered.triggeredBy !== transaction.id) {
      return callback(new BedrockError(
        'The Triggered Transaction is not marked as being triggered by the ' +
        'Contract.',
        MODULE_NS + '.InvalidTriggeredTransaction', {
          httpStatusCode: 400,
          'public': true,
          transactionId: transaction.id
        }));
    }
    // clear triggered
    delete transaction.triggered;
  }

  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
  var isWithdrawal = jsonld.hasValue(transaction, 'type', 'Withdrawal');

  var inserted = false;
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

      // check funding
      api.checkFunding(transaction, function(err, result) {
        if(err) {
          return callback(err);
        }
        if(!err && result.insufficientFunds && !result.canInstantTransfer) {
          var transfers = jsonld.getValues(transaction, 'transfer');
          var src = transfers[0].source;
          return callback(new BedrockError(
            'Insufficient funds in the source FinancialAccount.',
            MODULE_NS + '.InsufficientFunds', {
              httpStatusCode: 400,
              'public': true,
              transactionId: transaction.id,
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
      // txn now inserted
      inserted = true;

      // gather unique non-external destination account IDs
      var accounts = {};
      transaction.transfer.forEach(function(transfer) {
        if(!(isWithdrawal &&
          transfer.destination === transaction.destination.id)) {
          accounts[brDatabase.hash(transfer.destination)] =
            transfer.destination;
        }
      });
      // while checking dst FAs, gather all dst identities
      var dstHashes = Object.keys(accounts);
      var identities = [];
      brDatabase.collections.account.find(
        {id: {$in: dstHashes}}, {id: true, owner: true}).toArray(
        function(err, records) {
          if(!err) {
            // ensure all IDs were found
            var valid = _.map(records, function(record) {return record.id;});
            if(valid.length !== dstHashes.length) {
              var diff = _.difference(dstHashes, valid);
              var missing = _.map(diff, function(dst) {return accounts[dst];});
              err = new BedrockError(
                'Invalid destination FinancialAccount.',
                MODULE_NS + '.FinancialAccountNotFound', {
                  httpStatusCode: 404,
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
      var opts = {};
      if(triggered) {
        opts.deposit = triggered;
      }
      _authorizeTransaction(transaction, identities, opts, callback);
    },
    function(callback) {
      var now = +new Date();
      if(now >= transaction.sysSettleAfter) {
        // fire an event to settle the transaction
        bedrock.events.emitLater({
          type: EVENT_SETTLE,
          details: {transactionId: transaction.id}
        });
      }
      callback();
    }
  ], function(err) {
    if(err) {
      // restore triggered
      if(triggered) {
        transaction.triggered = triggered;
      }

      if(brDatabase.isDuplicateError(err)) {
        err = new BedrockError(
          'Could not create Transaction; duplicate Transaction ID.',
          MODULE_NS + '.DuplicateTransaction', {
            transaction: transaction,
            'public': true
          });
      } else if(inserted) {
        // fire event to void transaction
        var event = {
          type: EVENT_VOID,
          details: {transactionId: transaction.id}
        };
        if(err instanceof BedrockError) {
          event.details.voidReason = err.name;
        }
        bedrock.events.emitLater(event);
        err = new BedrockError(
          'Transaction could not be authorized; it has been voided.',
          MODULE_NS + '.VoidedTransaction', {
            transactionId: transaction.id, 'public': true
          }, err);
      } else if(!(err instanceof BedrockError)) {
        err = new BedrockError(
          'Transaction could not be authorized.',
          MODULE_NS + '.TransactionAuthorizationError', {
            transactionId: transaction.id, 'public': true
          }, err);
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
  payswarm.logger.verbose('voiding transaction', transactionId);
  options = options || {voidReason: MODULE_NS + '.Voided'};
  var transactionHash = brDatabase.hash(transactionId);
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
      brDatabase.collections.transaction.update(
        {id: transactionHash, $or: [
          {state: SETTLE_STATE.PENDING},
          {state: SETTLE_STATE.AUTHORIZED}]},
        update, brDatabase.writeOptions, callback);
    },
    // 2. If no update, get FT's state.
    function(n, info, callback) {
      // get record regardless of update to ensure transaction is looked up
      brDatabase.collections.transaction.findOne(
        {id: transactionHash}, {state: true, transaction: true}, callback);
    },
    // 3. If state is not voiding or voided, raise an error.
    function(record, callback) {
      var err = null;
      if(!record) {
        err = new BedrockError(
          'Could not void Transaction; Transaction not found.',
          MODULE_NS + '.TransactionNotFound');
      } else if(record.state !== SETTLE_STATE.VOIDING &&
        record.state !== SETTLE_STATE.VOIDED) {
        err = new BedrockError(
          'Could not void Transaction; Transaction has already been ' +
          'processed.', MODULE_NS + '.TransactionAlreadyProcessed');
      }

      // touch transaction if state was voiding
      if(!err && record.state === SETTLE_STATE.VOIDING) {
        return brDatabase.collections.transaction.update(
          {id: transactionHash, state: SETTLE_STATE.VOIDING},
          {$set: {'meta.updated': +new Date()}}, brDatabase.writeOptions,
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
 * @param actor the Identity performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param [flags] optional flags:
 *          isParticipant: if true, optimize as transaction participant.
 *          external: if true, remove data for internal use only.
 * @param callback(err, records) called once the operation completes.
 */
api.getTransactions = function(actor, query, fields, options, flags, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  } else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  } else if(typeof options === 'function') {
    callback = options;
    options = null;
  } else if(typeof flags === 'function') {
    callback = flags;
    flags = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  flags = flags || {};
  async.waterfall([
    function(callback) {
      brDatabase.collections.transaction.find(
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
          delete txn.sysSettleAfter;

          // ensure using standard @context URL
          txn['@context'] = payswarm.constants.CONTEXT_URL;
        } else {
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
            brIdentity.checkPermission(
              actor, PERMISSIONS.TRANSACTION_ACCESS, {
                resource: txn,
                translate: _checkTransactionAccess(rel)
              }, function(err) {
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

            if(flags.external) {
              delete txn.sysExternalStatusChecks;
              delete txn.sysGatewayApprovalCode;
              delete txn.sysGatewayRefId;

              if('destination' in txn) {
                delete txn.destination.paymentToken;
                delete txn.destination.sysStatus;
                delete txn.destination.sysVerified;
                delete txn.destination.sysVerifyReady;
              }

              if('source' in txn) {
                delete txn.source.paymentToken;
                delete txn.source.sysStatus;
                delete txn.source.sysVerified;
                delete txn.source.sysVerifyReady;
              }

              if('vendor' in txn && 'address' in txn.vendor) {
                delete txn.vendor.address.sysValidated;
              }

              if('assetAcquirer' in txn && 'address' in txn.assetAcquirer) {
                delete txn.assetAcquirer.address.sysValidated;
              }
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
 * @param actor the Identity performing the action.
 * @param id the ID of the Transaction to retrieve.
 * @param [flags] optional output flags:
 *          isParticipant: if true, optimize as transaction participant.
 *          external: if true, remove data for internal use only.
 * @param callback(err, transaction, meta) called once the operation completes.
 */
api.getTransaction = function(actor, id, flags, callback) {
  if(typeof flags === 'function') {
    callback = flags;
    flags = null;
  }
  flags = flags || {};

  async.waterfall([
    function(callback) {
      api.getTransactions(
        actor, {id: brDatabase.hash(id)},
        {transaction: true, meta: true}, {limit: 1}, flags, callback);
    },
    function(records, callback) {
      if(records.length === 0) {
        return callback(new BedrockError(
          'Transaction not found.',
          MODULE_NS + '.TransactionNotFound',
          {'public': true, httpStatusCode: 404, id: id}));
      }
      callback(null, records[0].transaction, records[0].meta);
    }
  ], callback);
};

/**
 * A utility method to check for funding for the given Transaction. Details
 * will be given in the callback that indicate whether or not the account has
 * insufficient funds, and if instant transfer is available.
 *
 * @param transaction the Transaction.
 * @param callback(err, result) called once the operation completes.
 */
api.checkFunding = function(transaction, callback) {
  var result = {
    insufficientFunds: true,
    canInstantTransfer: false
  };

  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;
  // lookup local account
  brDatabase.collections.account.findOne(
    {id: brDatabase.hash(src)}, {
      'account.backupSource': true,
      'account.balance': true,
      'account.creditLimit': true,
      'account.sysCreditDisabled': true,
      'account.sysAllowInstantTransfer': true,
      'account.sysMinInstantTransfer': true
    }, function(err, record) {
      if(err) {
        return callback(err);
      }
      if(record === null) {
        return callback(new BedrockError(
          'Invalid source FinancialAccount.',
          MODULE_NS + '.FinancialAccountNotFound', {
            httpStatusCode: 404,
            'public': true,
            transactionId: transaction.id,
            account: src
          }));
      }

      // calculate new balance
      var account = record.account;
      var balance = new Money(account.balance);
      var amount = new Money(transaction.amount);
      balance = balance.subtract(amount);

      // determine minimum allowed balance (if txn is not a withdrawal,
      // use credit limit if available)
      var isWithdrawal = jsonld.hasValue(transaction, 'type', 'Withdrawal');
      var minBalance;
      if(!isWithdrawal && 'creditLimit' in account &&
        !account.sysCreditDisabled) {
        minBalance = new Money(account.creditLimit).negate();
      } else {
        minBalance = new Money(0);
      }

      // determine if instant transfer is available for source account;
      // transaction must be a contract, instant transfer must be enabled,
      // contract amount must be less than minimum instant transfer amount, and
      // must have a backup source transaction must be a contract to use
      // instant transfer
      var isContract = jsonld.hasValue(transaction, 'type', 'Contract');
      var minInstantTransfer = new Money(
        account.sysMinInstantTransfer || 0);
      var sources = jsonld.getValues(account, 'backupSource');
      if(isContract && account.sysAllowInstantTransfer &&
        amount.compareTo(minInstantTransfer) >= 0 &&
        sources.length > 0) {
        result.canInstantTransfer = true;
      }

      // if new balance would be below minimum, insufficientFunds
      result.insufficientFunds = (balance.compareTo(minBalance) < 0);

      callback(null, result);
    });
};

/**
 * A utility method to create an instant transfer deposit for the given
 * Transaction. Only the first backup source will be used from the account,
 * and no checks are made to ensure the account supports instant transfer.
 *
 * @param transaction the Transaction.
 * @param options the options to use:
 *          [account] the prefetched account information.
 * @param callback(err, deposit) called once the operation completes.
 */
api.createInstantTransferDeposit = function(transaction, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;
  async.auto({
    getSource: function(callback) {
      if(options.account && options.account.id &&
        options.account.backupSource) {
        return callback({account: options.account});
      }

      // get source account info
      brDatabase.collections.account.findOne(
        {id: brDatabase.hash(src)}, {
          updateId: true,
          'account.backupSource': true,
          'account.id': true
        }, callback);
    },
    createDeposit: ['getSource', function(callback, results) {
      var record = results.getSource;
      if(!record) {
        return callback(new BedrockError(
          'Invalid source FinancialAccount.',
          MODULE_NS + '.FinancialAccountNotFound',
          {account: src, httpStatusCode: 404, 'public': true}));
      }

      // create deposit to instant fund account w/transaction amount, cycle
      // through backup sources until successful
      var account = record.account;
      var amount = new Money(transaction.amount);
      var sources = jsonld.getValues(account, 'backupSource');
      if(sources.length === 0) {
        return callback(new BedrockError(
          'Cannot perform instant transfer; FinancialAccount has no ' +
          'backup sources.',
          MODULE_NS + '.NoBackupSources', {
            httpStatusCode: 400,
            'public': true,
            transactionId: transaction.id,
            account: src
          }));
      }

      var source = sources[0];
      var deposit = {
        '@context': payswarm.constants.CONTEXT_V1_URL,
        type: ['Transaction', 'Deposit'],
        payee: [{
          type: 'Payee',
          payeeGroup: ['deposit'],
          payeeRate: amount.toString(),
          payeeRateType: 'FlatAmount',
          payeeApplyType: 'ApplyExclusively',
          destination: account.id,
          currency: 'USD',
          comment: 'Automated deposit to complete contract'
        }],
        source: source,
        triggeredBy: transaction.id,
        triggerReason: 'InsufficientFunds'
      };
      payswarm.financial.signDeposit(null, deposit, callback);
    }]
  }, function(err, results) {
    if(err) {
      return callback(err);
    }
    callback(null, results.createDeposit);
  });
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
  var src = brDatabase.hash(transfers[0].source);
  var dsts = [];
  transfers.forEach(function(transfer) {
    dsts.push(brDatabase.hash(transfer.destination));
  });

  // always run duplicate check against transaction ID
  var idDuplicateQuery = {id: brDatabase.hash(transaction.id)};
  if(duplicateQuery) {
    duplicateQuery = {$or: [idDuplicateQuery, duplicateQuery]};
  } else {
    duplicateQuery = idDuplicateQuery;
  }

  async.waterfall([
    function(callback) {
      _getTransactionIdentityAndAsset(transaction, callback);
    },
    function(identityId, assetId, callback) {
      var txnIdHash = brDatabase.hash(transaction.id);
      var identityIdHash = brDatabase.hash(identityId);
      var assetIdHash = brDatabase.hash(assetId);
      var referenceIdHash = brDatabase.hash(transaction.referenceId);
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
            brDatabase.collections.transaction.find(
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
            brDatabase.collections.transaction.findOne(
              duplicateQuery, {'transaction.id': true},
              function(err, record) {
                if(err) {
                  return callback(err);
                }
                // duplicate found
                if(record) {
                  return callback(new BedrockError(
                    'A Transaction already exists for the given parameters.',
                    MODULE_NS + '.DuplicateTransaction', {
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
            txn['@context'] = payswarm.constants.CONTEXT_URL;
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
            brDatabase.collections.transaction.insert(
              record, brDatabase.writeOptions, function(err, record) {
                // retry on duplicate
                if(brDatabase.isDuplicateError(err)) {
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
          return callback(new BedrockError(
            'Could not determine Deposit source\'s identity; invalid ' +
            'Deposit format.', MODULE_NS + '.InvalidTransaction',
            {transaction: transaction}));
        }
        return callback(null, transaction.source.owner);
      }

      // get identity ID via source financial account
      var transfers = jsonld.getValues(transaction, 'transfer');
      if(transfers.length === 0) {
        return callback(new BedrockError(
          'Could not determine Transaction source\'s identity; invalid ' +
          'Transaction format.', MODULE_NS + '.InvalidTransaction',
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
      } else {
        // no asset involved, use transaction ID as asset
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
 * @param options the authorization options, if any.
 *          [deposit] a signed deposit to use to provide instant transfer
 *            funding.
 *          [triggered] set to the ID of a deposit that was successfully
 *            triggered to provide instant funding; once set, no future
 *            attempts to perform instant transfers should be made by
 *            recursive calls to this method (an external transaction should
 *            exist that will provide the necessary funding).
 * @param callback(err) called once the operation completes.
 */
function _authorizeTransaction(transaction, identities, options, callback) {
  // for deposits, no source to update; mark transaction authorized
  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
  if(isDeposit) {
    // if deposit was triggered by insufficient funds or a promotion, then
    // assume no stored value will be accrued by its authorization
    if(transaction.triggerReason === 'InsufficientFunds' ||
      transaction.triggerReason === 'Promotion') {
      return _markTransactionAuthorized(transaction, identities, callback);
    }

    // check deposit destinations to ensure they will not accrue stored value
    return _checkDepositDestinations(transaction, function(err) {
      if(err) {
        return callback(err);
      }
      _markTransactionAuthorized(transaction, identities, callback);
    });
  }

  // handle all other transaction types
  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;
  async.auto({
    getSource: function(callback) {
      // get source account info
      brDatabase.collections.account.findOne(
        {id: brDatabase.hash(src)}, {
          updateId: true,
          'account.backupSource': true,
          'account.balance': true,
          'account.creditLimit': true,
          'account.creditBackedAmount': true,
          'account.id': true,
          'account.sysAllowInstantTransfer': true,
          'account.sysCreditDisabled': true,
          'account.sysMinInstantTransfer': true,
          'credit.payoffs': true
        }, callback);
    },
    fundSource: ['getSource', function(callback, results) {
      var record = results.getSource;
      if(!record) {
        return callback(new BedrockError(
          'Invalid source FinancialAccount.',
          MODULE_NS + '.FinancialAccountNotFound',
          {account: src, httpStatusCode: 404, 'public': true}));
      }
      _fundAccount(transaction, record.account, options, callback);
    }],
    updateAccount: ['fundSource', function(cb, results) {
      // get next update ID
      var record = results.getSource;
      var updateId = brDatabase.getNextUpdateId(record.updateId);

      // update source FA (balance and add outgoing transaction)
      var balance = results.fundSource.balance;
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.balance': balance.toString()
        }
      };
      // indicate unbacked credit use has started
      if(results.fundSource.startUnbackedCredit) {
        // set new credit payment due date
        var delta = bedrock.config.financial.transaction
          .creditPaymentDuePeriod;
        var due = new Date(transaction.created);
        due = payswarm.tools.w3cDate(due.setTime(due.getTime() + delta));
        update.$set['account.creditPaymentDue'] = due;
        update.$set.creditPaymentDue = new Date(due);
      }
      var transactionHash = brDatabase.hash(transaction.id);
      update.$set['outgoing.' + transactionHash] = transaction.sysSettleAfter;
      brDatabase.collections.account.update(
        {id: brDatabase.hash(src), updateId: record.updateId},
        update, brDatabase.writeOptions, function(err, n) {
          if(err) {
            return cb(err);
          }
          // if account not updated, try again
          if(n === 0) {
            // recurse using main callback
            return process.nextTick(_authorizeTransaction.bind(
              null, transaction, identities, options, callback));
          }
          cb();
        });
    }],
    updateTransaction: ['updateAccount', function(callback, results) {
      // account balance updated, set transaction state
      _markTransactionAuthorized(
        transaction, identities, {
          usedUnbackedCredit: results.fundSource.usedUnbackedCredit,
          accountRecord: results.getSource,
          triggered: results.fundSource.triggered
        }, callback);
    }]
  }, function(err) {
    callback(err);
  });
}

/**
 * Helper method that ensures destination accounts do not accrue stored
 * value unless otherwise permitted. This method ensures all pending funds
 * for each destination in a deposit are accounted for and checked prior
 * to authorization of the deposit. If there are other funds that are pending
 * settlement that would cause one of the destinations to overflow (accrue
 * stored value), then an error is raised.
 *
 * @param transaction the Deposit transaction.
 * @param callback(err) called once the operation completes.
 */
function _checkDepositDestinations(transaction, callback) {
  // get total transfer amount for each destination
  var amounts = {};
  var transfers = jsonld.getValues(transaction, 'transfer');
  transfers.forEach(function(transfer) {
    if(!(transfer.destination in amounts)) {
      amounts[transfer.destination] = new Money(transfer.amount);
    } else {
      amounts[transfer.destination] = amounts[transfer.destination].add(
        transfer.amount);
    }
  });
  // mark each deposit destination
  async.forEach(Object.keys(amounts), function(dst, callback) {
    _markDepositDestination(transaction, dst, amounts[dst], callback);
  }, callback);
}

/**
 * Helper method that atomically marks a single deposit destination by
 * increasing its pending funds prior to the deposit's authorization.
 *
 * @param transaction the Deposit transaction.
 * @param dst the Deposit destination ID.
 * @param amount the pending amount for the destination.
 * @param callback(err) called once the operation completes.
 */
function _markDepositDestination(transaction, dst, amount, callback) {
  var incoming = 'credit.incoming.' + brDatabase.hash(transaction.id);
  var dstHash = brDatabase.hash(dst);
  async.waterfall([
    function(callback) {
      var query = {id: dstHash};
      query[incoming] = {$exists: false};
      brDatabase.collections.account.findOne(
        query, {
          updateId: true,
          credit: true,
          'account.sysAllowStoredValue': true,
          'account.owner': true
        }, callback);
    },
    function(record, cb) {
      // record already updated, skip
      if(!record) {
        return callback();
      }
      // skip accounts that permit stored value/are authority-owned
      if(record.account.sysAllowStoredValue ||
        record.account.owner === bedrock.config.authority.id) {
        return callback();
      }
      if(!(record.credit && 'snapshot' in record.credit)) {
        // should never happen, bad DB or deposit code (did not call
        // update balance snapshot on every appropriate destination account)
        return cb(new BedrockError(
          'Deposit destination is missing credit record information.',
          MODULE_NS + '.InvalidDestination',
          {transaction: transaction, destination: dst}));
      }
      var balance = new Money(record.credit.snapshot)
        .add(record.credit.pending || 0)
        .add(amount);
      if(balance.compareTo(Money.ZERO) > 0) {
        return cb(new BedrockError(
          'Deposit destination would accrue stored value.',
          MODULE_NS + '.AccountStoredValueProhibited',
          {transaction: transaction, destination: dst}));
      }
      cb(null, record);
    },
    function(record, callback) {
      // get next update ID
      var updateId = brDatabase.getNextUpdateId(record.updateId);

      // update FA w/new credit.pending and add credit.incoming entry
      var pending = new Money(record.credit.pending || 0).add(amount);
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'credit.pending': pending.toString()
        }
      };
      update.$set[incoming] = true;
      brDatabase.collections.account.update(
        {id: dstHash, updateId: record.updateId},
        update, brDatabase.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return process.nextTick(_markDepositDestination.bind(
          null, transaction, dst, callback));
      }
      cb();
    }
  ], callback);
}

/**
 * Helper method that clears pending funds from deposit destination accounts
 * when the deposit is being voided or settled.
 *
 * @param transaction the Deposit transaction.
 * @param callback(err) called once the operation completes.
 */
function _clearDepositDestinations(transaction, callback) {
  // if deposit was triggered by insufficient funds or a promotion, then there
  // are no destination entries to clean up
  if(transaction.triggerReason === 'InsufficientFunds' ||
    transaction.triggerReason === 'Promotion') {
    return callback();
  }
  // get total transfer amount for each destination
  var amounts = {};
  var transfers = jsonld.getValues(transaction, 'transfer');
  transfers.forEach(function(transfer) {
    if(!(transfer.destination in amounts)) {
      amounts[transfer.destination] = new Money(transfer.amount);
    } else {
      amounts[transfer.destination] = amounts[transfer.destination].add(
        transfer.amount);
    }
  });
  // clear each deposit destination
  async.forEach(Object.keys(amounts), function(dst, callback) {
    _clearDepositDestination(transaction, dst, amounts[dst], callback);
  }, callback);
}

/**
 * Helper method that atomically clears a single deposit destination by
 * decrementing its pending funds when the deposit is being voided or settled.
 *
 * @param transaction the Deposit transaction.
 * @param dst the Deposit destination ID.
 * @param amount the pending amount for the destination.
 * @param callback(err) called once the operation completes.
 */
function _clearDepositDestination(transaction, dst, amount, callback) {
  var incoming = 'credit.incoming.' + brDatabase.hash(transaction.id);
  var dstHash = brDatabase.hash(dst);
  async.waterfall([
    function(callback) {
      var query = {id: dstHash};
      query[incoming] = {$exists: true};
      brDatabase.collections.account.findOne(
        query, {updateId: true, credit: true, 'account.balance': true},
        callback);
    },
    function(record, cb) {
      // record already updated, skip
      if(!record) {
        return callback();
      }

      // get next update ID
      var updateId = brDatabase.getNextUpdateId(record.updateId);

      // update FA w/new credit.snapshot and credit.pending and
      // remove credit.incoming entry
      var pending = new Money(record.credit.pending || 0).subtract(amount);
      if(pending.compareTo(Money.ZERO) < 0) {
        pending = Money.ZERO;
      }
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'credit.snapshot': record.account.balance,
          'credit.pending': pending.toString()
        }
      };
      update.$unset[incoming] = true;
      brDatabase.collections.account.update(
        {id: dstHash, updateId: record.updateId},
        update, brDatabase.writeOptions, cb);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return process.nextTick(_clearDepositDestination.bind(
          null, transaction, dst, callback));
      }
      cb();
    }
  ], callback);
}

/**
 * Helper method that ensures a source FinancialAccount has enough funds
 * to complete a Transaction.
 *
 * @param transaction the Transaction.
 * @param account the source FinancialAccount.
 * @param options the funding options:
 *          [deposit] a signed deposit to use to provide funding.
 *          [triggered] set to the ID of a deposit that was triggered to
 *            provide instant funding; once set, no future instant transfer
 *            attempts should be made.
 * @param callback(err, details) called once the operation completes.
 */
function _fundAccount(transaction, account, options, callback) {
  var rval = {};

  // subtract transaction amount from balance
  var balance = new Money(account.balance);
  var amount = new Money(transaction.amount);
  rval.balance = balance.subtract(amount);

  // determine if unbacked credit will be used and if it's a new period
  var threshold = new Money(account.creditBackedAmount || 0).negate();
  rval.usedUnbackedCredit = (rval.balance.compareTo(threshold) < 0);
  rval.startUnbackedCredit = (rval.usedUnbackedCredit &&
    balance.compareTo(threshold) >= 0);

  // if instant transfer was used (deposit triggered, skip remaining steps)
  if(options.triggered) {
    rval.triggered = options.triggered;
    return callback(null, rval);
  }

  // determine minimum allowed balance (use credit limit if available)
  var minBalance;
  if('creditLimit' in account && !account.sysCreditDisabled) {
    minBalance = new Money(account.creditLimit).negate();
  } else {
    minBalance = new Money(0);
  }

  // determine if source has sufficient funds for contract
  var sufficientFunds = (rval.balance.compareTo(minBalance) >= 0);

  // account has sufficient funds and no optional deposit given, return early
  if(sufficientFunds && !options.deposit) {
    return callback(null, rval);
  }

  // can do instant transfer if transaction is a contract and either
  // options.deposit/options.triggered is given or (instant transfer feature is
  // enabled, contract amount is less than minimum instant transfer amount, and
  // a account backup source is available)
  var minInstantTransfer = new Money(account.sysMinInstantTransfer || 0);
  var isContract = jsonld.hasValue(transaction, 'type', 'Contract');
  var sources = jsonld.getValues(account, 'backupSource').slice();
  var canInstantTransfer = (isContract &&
    (options.deposit || options.triggered ||
    (account.sysAllowInstantTransfer &&
      amount.compareTo(minInstantTransfer) >= 0 &&
      sources.length > 0)));
  if(!canInstantTransfer) {
    return callback(new BedrockError(
      'Insufficient funds in the source FinancialAccount.',
      MODULE_NS + '.InsufficientFunds', {
        httpStatusCode: 400,
        'public': true,
        transactionId: transaction.id,
        account: account.id
      }));
  }

  // a deposit is being associated with the contract, so not using credit
  rval.usedUnbackedCredit = false;
  rval.startUnbackedCredit = false;

  // signed deposit given, use it
  if(options.deposit) {
    return payswarm.financial.processDeposit(
      null, options.deposit, function(err, deposit) {
        if(err) {
          return callback(err);
        }
        // indicate a deposit was triggered
        options.triggered = rval.triggered = deposit.id;
        callback(err, rval);
      });
  }

  // create deposit to instant fund account w/contract amount, cycle through
  // backup sources until successful
  var error;
  async.whilst(function() {return sources.length > 0;}, function(next) {
    var source = sources.shift();
    async.waterfall([
      function(callback) {
        var deposit = {
          '@context': payswarm.constants.CONTEXT_V1_URL,
          type: ['Transaction', 'Deposit'],
          payee: [{
            type: 'Payee',
            payeeGroup: ['deposit'],
            payeeRate: amount.toString(),
            payeeRateType: 'FlatAmount',
            payeeApplyType: 'ApplyExclusively',
            destination: account.id,
            currency: 'USD',
            comment: 'Automated deposit to complete contract'
          }],
          source: source,
          triggeredBy: transaction.id,
          triggerReason: 'InsufficientFunds'
        };
        payswarm.financial.signDeposit(null, deposit, callback);
      },
      function(deposit, callback) {
        payswarm.financial.processDeposit(null, deposit, callback);
      },
      function(deposit, callback) {
        // indicate a deposit was triggered
        options.triggered = rval.triggered = deposit.id;
        callback();
      }
    ], function(err) {
      error = err;
      if(err) {
        return next();
      }
      // success
      callback(null, rval);
    });
  }, function() {
    callback(error);
  });
}

/**
 * Helper method that marks a Transaction as authorized after any related
 * sources have been atomically updated.
 *
 * @param transaction the Transaction.
 * @param identities an array of destination identity ID hashes to add
 *          to the transaction for indexing.
 * @param options the options to use.
 *          [usedUnbackedCredit] true if the Transaction resulted in the use of
 *            unbacked credit.
 *          [accountRecord] if usedUnbackedCredit is true, then this option is
 *            also given and it provides minimal information from the record
 *            for the source account of the transaction.
 *          [triggered] a the ID of a Transaction that was triggered by the
 *            given Transaction (eg: a Contract may trigger a Deposit to
 *            cover its cost).
 * @param callback(err) called once the operation completes.
 */
function _markTransactionAuthorized(
  transaction, identities, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || {};
  async.waterfall([
    function(callback) {
      var update = {
        $set: {
          state: SETTLE_STATE.AUTHORIZED,
          'meta.updated': +new Date(),
          'transaction.authorized': payswarm.tools.w3cDate()
        },
        // add destination identities to index
        $addToSet: {
          identities: {$each: identities}
        }
      };
      // if unbacked credit was used then include payoff count w/transaction
      if(options.usedUnbackedCredit) {
        var record = options.accountRecord;
        var payoffs = record.credit ? record.credit.payoffs || '0' : '0';
        update.$set['transaction.sysCreditPayoffs'] = payoffs;
      }
      if(options.triggered) {
        update.$addToSet['transaction.triggered'] = options.triggered;
      }
      brDatabase.collections.transaction.update(
        {id: brDatabase.hash(transaction.id), state: SETTLE_STATE.PENDING},
        update, brDatabase.writeOptions, callback);
    },
    // raise an error if transaction was not authorized
    function(n, info, callback) {
      if(n === 0) {
        return callback(new BedrockError(
          'Transaction could not be authorized.',
          MODULE_NS + '.AuthorizationError'));
      }
      callback();
    }
  ], function(err) {callback(err);});
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
  async.waterfall([
    function(callback) {
      if(isDeposit) {
        // clear deposit destinations
        return _clearDepositDestinations(transaction, callback);
      }
      return callback();
    },
    function(callback) {
      _clearSourceAccount(transaction, callback);
    },
    // set transaction state
    function(callback) {
      brDatabase.collections.transaction.update(
        {id: brDatabase.hash(transaction.id)},
        {$set: {
          state: SETTLE_STATE.VOIDED,
          'meta.updated': +new Date()}},
        brDatabase.writeOptions, function(err) {callback(err);});
    },
    // fire event
    function(callback) {
      // may fire multiple times
      bedrock.events.emitLater({
        type: EVENT_VOIDED,
        details: {transaction: transaction}
      });
      callback();
    }
  ], callback);
}

/**
 * Atomically clears a source account's record of an outgoing transaction when
 * that transaction is being voided.
 *
 * @param transaction the transaction that is being voided.
 */
function _clearSourceAccount(transaction, callback) {
  // source for destination is non-account, skip (nothing to clear)
  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
  if(isDeposit) {
    return callback();
  }

  var transactionHash = brDatabase.hash(transaction.id);
  var outgoing = 'outgoing.' + transactionHash;
  var transfers = jsonld.getValues(transaction, 'transfer');
  var src = transfers[0].source;
  async.waterfall([
    function(callback) {
      // get source account updateId and balance
      var query = {id: brDatabase.hash(src)};
      query[outgoing] = {$exists: true};
      brDatabase.collections.account.findOne(
        query, {
          updateId: true,
          'account.balance': true,
          'account.creditBackedAmount': true,
          credit: true
        }, callback);
    },
    function(record, callback) {
      if(!record) {
        // account doesn't exist (or its outgoing txn entry has already been
        // cleaned up), proceed as if it was updated
        return callback(null, 1, null);
      }

      // add transaction amount to balance, determine if credit paid off
      var balance = new Money(record.account.balance);
      var amount = new Money(transaction.amount);
      var creditBackedAmount = record.account.creditBackedAmount;
      var threshold = new Money(creditBackedAmount || 0).negate();
      var wasBelowThreshold = (balance.compareTo(threshold) < 0);
      balance = balance.add(amount);
      var nowMeetsThreshold = (balance.compareTo(threshold) >= 0);

      // get next update ID
      var updateId = brDatabase.getNextUpdateId(record.updateId);

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
      // increment credit payoff counter if unbacked credit paid off
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
      brDatabase.collections.account.update(
        {id: brDatabase.hash(src), updateId: record.updateId},
        update, brDatabase.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return process.nextTick(_clearSourceAccount.bind(
          null, transaction, callback));
      }
      cb();
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
  payswarm.logger.verbose('processing transaction', transactionId);
  var transactionHash = brDatabase.hash(transactionId);
  async.waterfall([
    // get transaction
    function(callback) {
      // FIXME: could probably pull out only a portion of the txn here
      // or pass it to the subsequent calls to optimize a bit
      brDatabase.collections.transaction.findOne(
        {id: transactionHash}, {transaction: true},
        callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new BedrockError(
          'Could not process Transaction; Transaction not found.',
          MODULE_NS + '.TransactionNotFound'));
      }
      callback(null, record);
    },
    // check contracts with sysCreditPayoffs property
    function(record, callback) {
      var transaction = record.transaction;
      var isContract = jsonld.hasValue(transaction, 'type', 'Contract');
      if(!isContract || !('sysCreditPayoffs' in transaction)) {
        return callback(null, record);
      }

      var transfers = jsonld.getValues(transaction, 'transfer');
      var src = transfers[0].source;
      async.waterfall([
        function(callback) {
          // check source account's # of credit payoffs
          brDatabase.collections.account.findOne(
            {id: brDatabase.hash(src)}, {'credit.payoffs': true},
            callback);
        },
        function(accountRecord, callback) {
          // allow settlement of transaction to continue if payoffs incremented
          var currPayoffs = '0';
          if(accountRecord && accountRecord.credit) {
            currPayoffs = accountRecord.credit.payoffs || '0';
          }
          currPayoffs = new BigNumber(currPayoffs);
          var prevPayoffs = new BigNumber(transaction.sysCreditPayoffs);
          if(prevPayoffs.cmp(currPayoffs) < 0) {
            return callback();
          }

          // delay settlement according to config
          var now = +new Date();
          var update = {$set: {'meta.updated': now}};
          update.$set['transaction.sysSettleAfter'] =
            now + bedrock.config.financial.transaction
              .creditPayoffSettleAfterIncrement;

          // only update if transaction is still in authorized state
          brDatabase.collections.transaction.update({
            id: brDatabase.hash(transaction.id),
            state: SETTLE_STATE.AUTHORIZED
          }, update, brDatabase.writeOptions, function(err) {
            if(err) {
              return callback(err);
            }
            callback(new BedrockError(
              'The Transaction is still pending because the source ' +
              'FinancialAccount\'s negative balance has not been paid ' +
              'back yet.',
              MODULE_NS + '.CreditPayoffPending',
              {transactionId: transaction.id, accountId: src}));
          });
        }
      ], function(err) {
        callback(err, record);
      });
    },
    // check deposit triggered by insufficient funds
    function(record, callback) {
      var transaction = record.transaction;
      var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
      if(!isDeposit || transaction.triggerReason !== 'InsufficientFunds') {
        return callback(null, record);
      }

      // check state of contract that triggered deposit
      brDatabase.collections.transaction.findOne(
        {id: brDatabase.hash(transaction.triggeredBy)}, {state: true},
        function(err, trigger) {
          if(err) {
            return callback(err);
          }
          if(!trigger) {
            // fire an event to void the transaction
            bedrock.events.emitLater({
              type: EVENT_VOID,
              details: {transactionId: transaction.id}
            });
            return callback(new BedrockError(
              'The Transaction was triggered by another that does not exist ' +
              'and has therefore been voided.',
              MODULE_NS + '.TriggerTransactionNotFound', {
                transactionId: transaction.id,
                triggeredBy: transaction.triggeredBy
              }));
          }
          if(trigger.state === SETTLE_STATE.PENDING) {
            // delay settlement according to config
            var now = +new Date();
            var update = {$set: {'meta.updated': now}};
            update.$set['transaction.sysSettleAfter'] =
              now + bedrock.config.financial.transaction
                .triggerSettleAfterIncrement;

            // only update if transaction is still in authorized state
            return brDatabase.collections.transaction.update({
              id: brDatabase.hash(transaction.id),
              state: SETTLE_STATE.AUTHORIZED
            }, update, brDatabase.writeOptions, function(err) {
              if(err) {
                return callback(err);
              }
              callback(new BedrockError(
                'The Transaction is still pending because it was ' +
                'triggered by another one that is pending.',
                MODULE_NS + '.TriggerTransactionPending', {
                  transactionId: transaction.id,
                  triggeredBy: transaction.triggeredBy
                }));
            });
          }
          if(trigger.state === SETTLE_STATE.VOIDING ||
            trigger.state === SETTLE_STATE.VOIDED) {
            // fire an event to void the transaction
            bedrock.events.emitLater({
              type: EVENT_VOID,
              details: {transactionId: transaction.id}
            });
            return callback(new BedrockError(
              'The Transaction has been voided because the Transaction that ' +
              'triggered it has been voided.',
              MODULE_NS + '.TriggerTransactionVoided', {
                transactionId: transaction.id,
                triggeredBy: transaction.triggeredBy
              }));
          }
          // other states are authorized, processing, settling, settled, so
          // allow transaction to be processed
          callback(null, record);
        });
    },
    // check external payment gateway for deposits and withdrawals
    function(record, callback) {
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
      brDatabase.collections.transaction.findAndModify(
        {id: transactionHash, $or: [
          {state: SETTLE_STATE.AUTHORIZED},
          {state: SETTLE_STATE.PROCESSING}]},
        [['id', 'asc']],
        update,
        payswarm.tools.extend({}, brDatabase.writeOptions, {
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
        return brDatabase.collections.transaction.findOne(
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
        return callback(new BedrockError(
          'Could not process Transaction; Transaction not found.',
          MODULE_NS + '.TransactionNotFound'));
      }
      // transaction already processed by another process
      if(record.state === SETTLE_STATE.SETTLING ||
        record.state === SETTLE_STATE.SETTLED) {
        return callback(null, record);
      }
      if(record.state === SETTLE_STATE.VOIDING ||
        record.state === SETTLE_STATE.VOIDED) {
        return callback(new BedrockError(
          'Could not process Transaction; Transaction has been voided.',
          MODULE_NS + '.TransactionVoided'));
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
 * Returns a callback that maps the given Transaction to a list of
 * identifiers to check against the actor's permission table. How the
 * actor is related to the transaction will be cached in the given
 * relationship object.
 *
 * @param rel the relationship object to populate.
 *
 * @return an identifier translation function.
 */
function _checkTransactionAccess(rel) {
  rel = rel || {};
  return function(permission, options, callback) {
    // FIXME: allow reads of the transaction if the actor was involved in
    // a source or destination payment, but ensure to clean the transaction
    // such that only transfers that the actor was involved in are shown
    var actor = options.actor;
    var txn = options.resource;
    async.auto({
      isAssetAcquirer: function(callback) {
        rel.isAssetAcquirer = false;

        // check to see if any of the identities is the asset acquirer
        if(txn.assetAcquirer) {
          rel.isAssetAcquirer = (actor.id === txn.assetAcquirer.id);
        }
        callback();
      },
      isAssetProvider: function(callback) {
        rel.isAssetProvider = false;

        // check to see if any of the identities is the asset provider
        if(txn.assetProvider) {
          rel.isAssetProvider = (actor.id === txn.assetProvider.id);
        }
        callback();
      },
      isVendor: function(callback) {
        rel.isVendor = false;

        // check to see if any of the identities is the vendor
        if(txn.vendor) {
          rel.isVendor = (actor.id === txn.vendor.id);
        }
        callback();
      },
      isSourceOwner: function(callback) {
        rel.isSourceOwner = false;

        // check to see if any of the identities is the source owner
        if(txn.source && txn.source.owner) {
          rel.isSourceOwner = (actor.id === txn.source.owner);
        }
        callback();
      },
      isDestinationOwner: function(callback) {
        rel.isDestinationOwner = false;

        // check to see if any of the identities is the destination owner
        if(txn.destination && txn.destination.owner) {
          rel.isDestinationOwner = (actor.id === txn.destination.owner);
        }
        callback();
      },
      isParticipant: ['isAssetAcquirer', 'isAssetProvider', 'isVendor',
        'isSourceOwner', 'isDestinationOwner', function(callback) {
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
        brDatabase.collections.transaction.findOne({
          id: brDatabase.hash(txn.id),
          identities: brDatabase.hash(actor.id)
        }, {id: true}, function(err, record) {
          if(!err && record) {
            rel.isParticipant = true;
          }
          callback(err);
        });
      }]
    }, function(err) {
      // if actor is a participant, check permission against the actor,
      // otherwise check it against the transaction ID
      callback(err, rel.isParticipant ? actor.id : txn.id);
    });
  };
}

/**
 * Determines if a Deposit or Withdrawal is ready to be settled by ensuring
 * any related monetary transactions performed by an external payment gateway
 * have reached an acceptable state. The acceptable state can vary by at least
 * the type of payment source or destination. For instance, if a Deposit's
 * payment source was a card (or a tokenized card), then the payment gateway
 * may determine that the Deposit is automatically considered settleable. It
 * may, alternatively, perform a card capture on any held funds before
 * determining that the Deposit is settleable. If the payment source or
 * destination of the Transaction is a bank account, an inquiry into a pending
 * ACH transaction's state may need to be made.
 *
 * @param transaction the Transaction (Deposit/Withdrawal) to process.
 * @param callback(err) called once the operation completes.
 */
function _checkExternalTransactionStatus(transaction, callback) {
  var isDeposit = jsonld.hasValue(transaction, 'type', 'Deposit');
  var account = isDeposit ? transaction.source : transaction.destination;

  // verify payment gateway
  var gateway = account.paymentGateway;
  if(!(gateway in payswarm.financial.paymentGateways)) {
    return callback(new BedrockError(
      'Invalid payment gateway.',
      MODULE_NS + '.InvalidPaymentGateway',
      {paymentGateway: gateway}));
  }
  gateway = payswarm.financial.paymentGateways[gateway];

  async.waterfall([
    function(callback) {
      // if transaction has sysExternalStatus set on it, use it as an
      // override
      if('sysExternalStatus' in transaction) {
        return callback(null, {status: transaction.sysExternalStatus});
      }

      // if # of status checks exceeded, issue critical warning
      if(transaction.sysExternalStatusChecks >=
        bedrock.config.financial.transaction.maxExternalStatusChecks) {
        var err = new BedrockError(
          'Maximum number of status checks exceeded for transaction "' +
          transaction.id + '", intervention required to reset ' +
          '"sysExternalStatusChecks" once the transaction has been ' +
          'settled via the payment gateway.',
          MODULE_NS + '.MaximumTransactionStatusChecksExceeded',
          {transactionId: transaction.id});
        bedrock.events.emitLater({
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
      var now = +new Date();
      var update = {
        $set: {'meta.updated': now},
        $inc: {}
      };
      if(result && !('sysExternalStatus' in transaction)) {
        // increment number of status checks on txn (if not overridden)
        update.$inc['transaction.sysExternalStatusChecks'] = 1;
      }

      // no result or external txn still pending or error
      if(!result || result.status === 'pending' || result.status === 'error') {
        // use settleAfterIncrement from result if available
        if(result && 'settleAfterIncrement' in result) {
          update.$set['transaction.sysSettleAfter'] =
            now + result.settleAfterIncrement;
        } else {
          // increment settleAfter according to config
          update.$set['transaction.sysSettleAfter'] =
            now + bedrock.config.financial.transaction
              .statusSettleAfterIncrement;
        }
      }

      // update any sysGateway flags
      Object.keys(transaction).forEach(function(key) {
        if(key.indexOf('sysGateway') === 0) {
          update.$set['transaction.' + key] = transaction[key];
        }
      });

      // only update if transaction is still in authorized state
      brDatabase.collections.transaction.update({
        id: brDatabase.hash(transaction.id),
        state: SETTLE_STATE.AUTHORIZED
      }, update, brDatabase.writeOptions, function(err) {
        callback(err, result);
      });
    },
    function(result, callback) {
      // external txn settled
      if(result && result.status === SETTLE_STATE.SETTLED) {
        return callback();
      }

      // external txn still pending
      if(!result || result.status === 'pending') {
        return callback(new BedrockError(
          'The Transaction is still pending because an associated external ' +
          'transaction is pending.',
          MODULE_NS + '.ExternalTransactionPending',
          {transactionId: transaction.id}));
      }

      var details = {
        transactionId: transaction.id
      };

      // external txn voided
      if(result && result.status === SETTLE_STATE.VOIDED) {
        // fire event indicating external transaction voided
        bedrock.events.emitLater({
          type: 'common.Transaction.externalTransactionVoided',
          details: details
        });
        // fire an event to void the transaction
        bedrock.events.emitLater({
          type: EVENT_VOID,
          details: {transactionId: transaction.id}
        });
        return callback(new BedrockError(
          'The associated external transaction has been voided.',
          MODULE_NS + '.ExternalTransactionVoided',
          {transactionId: transaction.id}));
      }

      // result status must be 'error'
      var err = new BedrockError(
        'The payment gateway returned an error during a transaction ' +
        'status check.', MODULE_NS + '.PaymentGatewayError',
        details);
      bedrock.events.emitLater({
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
  var transactionHash = brDatabase.hash(transaction.id);
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
            var query = {id: brDatabase.hash(dst), $or: [{}, {}]};
            query.$or[0][incoming] = {$exists: false};
            query.$or[1][incoming] = {$lte: settleId};
            var update = {$set: {'meta.updated': +new Date()}};
            update.$set[incoming] = settleId;
            brDatabase.collections.account.update(
              query, update, brDatabase.writeOptions, callback);
          },
          function(n, info, callback) {
            // entry updated, done
            if(n === 1) {
              return callback();
            }
            // no update, safe to assume another worker has overridden this one
            payswarm.logger.verbose(
              'transaction worker for transaction ' + transaction.id +
              ' overridden');

            // clean up any destination accounts that have been written to
            _cleanDestinationAccounts(transaction, settleId, function(err) {
              // set error to break out of for each loop
              if(!err) {
                err = new BedrockError(
                  'Transaction processing interrupted.',
                  MODULE_NS + '.ProcessingInterrupted');
              }
              callback(err);
            });
          }
        ], callback);
      }, function(err) {
        // clear error that was used to break out of for each loop, the code
        // that is next in the waterfall can be executed in either case
        // (success or interruption)
        if(err && err.name === (MODULE_NS + '.ProcessingInterrupted')) {
          err = null;
        }
        callback(err);
      });
    },
    // 5. Set transaction state to settling where old settle ID matches.
    function(callback) {
      brDatabase.collections.transaction.update(
        {id: transactionHash, settleId: settleId,
          state: SETTLE_STATE.PROCESSING},
        {$set: {
          state: SETTLE_STATE.SETTLING,
          'meta.updated': +new Date()
        }},
        brDatabase.writeOptions, callback);
    },
    // if no update, get FT's state.
    function(n, info, callback) {
      if(n === 0) {
        return brDatabase.collections.transaction.findOne(
          {id: transactionHash}, {state: true, settleId: true}, callback);
      }
      callback(null, {state: SETTLE_STATE.SETTLING, settleId: settleId});
    },
    // if state is 'settling' or 'settled', finish, otherwise error
    function(record, callback) {
      if(!record) {
        return callback(new BedrockError(
          'Could not process Transaction; Transaction not found.',
          MODULE_NS + '.TransactionNotFound'));
      }
      // include txn in record (avoids returning from db)
      record.transaction = transaction;
      if(record.state === SETTLE_STATE.SETTLING ||
        record.state === SETTLE_STATE.SETTLED) {
        return callback(null, record);
      }
      if(record.state === SETTLE_STATE.PROCESSING) {
        return callback(new BedrockError(
          'Could not process Transaction; another process has assumed ' +
          'responsibility for processing this Transaction.',
          MODULE_NS + '.TransactionOverridden'));
      }
      if(record.state === SETTLE_STATE.VOIDING ||
        record.state === SETTLE_STATE.VOIDED) {
        return callback(new BedrockError(
          'Could not process Transaction; Transaction has been voided.',
          MODULE_NS + '.TransactionVoided'));
      }
      return callback(new BedrockError(
        'Could not process Transaction; invalid Transaction state.',
        MODULE_NS + '.InvalidTransactionState'));
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
  var transactionHash = brDatabase.hash(transaction.id);
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
      brDatabase.collections.account.update(
        {id: brDatabase.hash(src)}, update,
        brDatabase.writeOptions, function(err) {
          callback(err);
        });
    },
    // 5. Set transaction state to settled.
    function(callback) {
      var now = new Date();
      var settled = payswarm.tools.w3cDate(now);
      brDatabase.collections.transaction.update(
        {id: transactionHash, state: SETTLE_STATE.SETTLING},
        {$set: {
          state: SETTLE_STATE.SETTLED,
          'transaction.settled': settled,
          'meta.updated': +now}},
        brDatabase.writeOptions, function(err, n, info) {
          callback(err, settled, n, info);
        });
    },
    // if no update, get FT's state.
    function(settled, n, info, callback) {
      if(n === 0) {
        return brDatabase.collections.transaction.findOne(
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
        return callback(new BedrockError(
          'Could not settle Transaction; Transaction not found.',
          MODULE_NS + '.TransactionNotFound'));
      }
      if(record.state === SETTLE_STATE.SETTLED) {
        // update settled field in local transaction object
        transaction.settled = record.transaction.settled;
        bedrock.events.emitLater({
          type: EVENT_SETTLED,
          details: {transaction: transaction}
        });
        return callback();
      }
      return callback(new BedrockError(
        'Could not settle Transaction; invalid Transaction state.',
        MODULE_NS + '.InvalidTransactionState'));
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
  var transactionHash = brDatabase.hash(transactionId);
  var incoming = 'incoming.' + transactionHash;
  var creditIncoming = 'credit.' + incoming;
  async.waterfall([
    function(callback) {
      // get destination account updateId, balance, and credit info
      var query = {id: brDatabase.hash(dst)};
      query[incoming] = {$exists: true};
      var fields = {
        updateId: true,
        'account.balance': true,
        'account.creditBackedAmount': true,
        credit: true
      };
      fields[incoming] = true;
      brDatabase.collections.account.findOne(query, fields, callback);
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
        return brDatabase.collections.account.update(
          {id: brDatabase.hash(dst)}, update,
          brDatabase.writeOptions, function(err) {
            callback(err, 1, null);
          });
      }

      // add account amount to balance, determine if credit paid off
      var balance = new Money(record.account.balance);
      var creditBackedAmount = record.account.creditBackedAmount;
      var threshold = new Money(creditBackedAmount || 0).negate();
      var wasBelowThreshold = (balance.compareTo(threshold) < 0);
      balance = balance.add(amount);
      var nowMeetsThreshold = (balance.compareTo(threshold) >= 0);

      // get next update ID
      var updateId = brDatabase.getNextUpdateId(record.updateId);

      // update destination FA (new balance, remove incoming transaction)
      var update = {
        $set: {
          updateId: updateId,
          'meta.updated': +new Date(),
          'account.balance': balance.toString()
        },
        $unset: {}
      };
      update.$unset[incoming] = true;
      // if credit active and credit.incoming entry exists, remove it and
      // reset credit.snapshot and decrease credit.pending
      if(record.credit && record.credit.incoming[transactionHash] === true) {
        update.$set['credit.snapshot'] = balance.toString();
        update.$set['credit.pending'] = new Money(
          record.credit.pending).subtract(amount).toString();
        update.$unset[creditIncoming] = true;
      }
      // increment credit payoff counter if unbacked credit paid off
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
      brDatabase.collections.account.update(
        {id: brDatabase.hash(dst), updateId: record.updateId},
        update, brDatabase.writeOptions, callback);
    },
    function(n, info, cb) {
      // if account not updated, try again
      if(n === 0) {
        // recurse using main callback
        return process.nextTick(_settleDestinationAccount.bind(
          null, transactionId, settleId, dst, amount, callback));
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
  payswarm.logger.verbose(
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
  var transactionHash = brDatabase.hash(transaction.id);
  var incoming = 'incoming.' + transactionHash;

  // remove any entry is that is <= settle ID
  var query = {id: brDatabase.hash(dst)};
  query[incoming] = {$lte: settleId};
  var update = {$unset: {}};
  update.$unset[incoming] = true;
  brDatabase.collections.account.update(
    query, update, brDatabase.writeOptions, function(err) {
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
 *          reschedule: the number of milliseconds to wait before rescheduling
 *            another worker with the same options.
 * @param callback(err) called once the operation completes.
 */
function _runWorker(options, callback) {
  // worker expiration is used to indicate when to forcibly override another
  // worker
  var now = +new Date();
  var expiration = bedrock.config.financial.transaction.worker.expiration;
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
    query = {'transaction.sysSettleAfter': {$lte: now}};
    if(options.id) {
      query.id = brDatabase.hash(options.id);
    } else {
      query['workers.id'] = null;
      query.$or = [
        {state: SETTLE_STATE.AUTHORIZED},
        {state: SETTLE_STATE.PROCESSING},
        {state: SETTLE_STATE.SETTLING}
      ];
      expiredQuery = {
        'transaction.sysSettleAfter': {$lte: now},
        'workers.start': {$lte: past},
        $or: [
          {state: SETTLE_STATE.AUTHORIZED},
          {state: SETTLE_STATE.PROCESSING},
          {state: SETTLE_STATE.SETTLING},
          {state: SETTLE_STATE.SETTLED}
        ]
      };
    }
  } else if(options.algorithm === 'void') {
    /* To mark a transaction to be voided:
    1. The ID must match if a specific Transaction ID is given, otherwise
    2. The settleAfter date must be now or passed.
    3. The last update time must be in the past.
    4. There must be no assigned worker and a state of pending or voiding, OR
    5. There must be an expired worker and a state of pending, voiding,
      or voided.
    */
    if(options.id) {
      query = {id: brDatabase.hash(options.id)};
    } else {
      query = {
        'transaction.sysSettleAfter': {$lte: now},
        'meta.updated': {$lte: past},
        'workers.id': null,
        $or: [
          {state: SETTLE_STATE.PENDING},
          {state: SETTLE_STATE.VOIDING}
        ]
      };
      expiredQuery = {
        'transaction.sysSettleAfter': {$lte: now},
        'meta.updated': {$lte: past},
        'workers.start': {$lte: past},
        $or: [
          {state: SETTLE_STATE.PENDING},
          {state: SETTLE_STATE.VOIDING},
          {state: SETTLE_STATE.VOIDED}
        ]
      };
    }
  } else {
    return callback(new BedrockError(
      'Invalid Transaction worker algorithm.',
      MODULE_NS + '.InvalidWorkerAlgorithm',
      {algorithm: options.algorithm}));
  }

  payswarm.logger.verbose(
    'running transaction worker (' + workerId + ') ' +
    'to ' + options.algorithm + ' transaction' +
    (options.id ? (' "' + options.id + '"') : 's') + '...');

  // single update and new record retrieval db write options
  var singleUpdate = payswarm.tools.extend(
    {}, brDatabase.writeOptions, {upsert: false, multi: false});

  // run algorithm on all matching entries
  var done = false;
  async.until(function() {return done;}, function(callback) {
    async.waterfall([
      function(callback) {
        // mark a single txn at a time
        brDatabase.collections.transaction.update(
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
        brDatabase.collections.transaction.update(
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
            return callback(new BedrockError(
              'Could not ' + options.algorithm + ' Transaction; ' +
              'Transaction not found.',
              MODULE_NS + '.TransactionNotFound'));
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
        brDatabase.collections.transaction.findOne(
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
            if(err && !brDatabase.isDatabaseError(err)) {
              savedError = err;
              err = null;
            }
            callback(err, transactionId, savedError);
          });
        } else if(options.algorithm === 'void') {
          var opts = {
            voidReason: options.voidReason || (MODULE_NS + '.Expired')
          };
          api.voidTransaction(transactionId, opts, function(err) {
            // save non-db error
            var savedError = null;
            if(err && !brDatabase.isDatabaseError(err)) {
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
        brDatabase.collections.transaction.update(
          {id: brDatabase.hash(transactionId)},
          {$pull: {workers: {id: workerId}}},
          brDatabase.writeOptions, function(err) {
            // propagate saved error
            if(!err && savedError) {
              err = savedError;
            }
            // when doing batch (non-specific ID, ignore non-db errors)
            if(err && !options.id && !brDatabase.isDatabaseError(err)) {
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
    payswarm.logger.verbose('transaction worker (' + workerId + ') finished.');

    if(options.reschedule) {
      // reschedule worker if requested
      payswarm.logger.verbose(
        'rescheduling transaction ' + options.algorithm + ' worker in ' +
        options.reschedule + ' ms');
      setTimeout(function() {
        var event = {details: {}};
        if(options.algorithm === 'settle') {
          event.type = EVENT_SETTLE;
        } else {
          event.type = EVENT_VOID;
        }
        bedrock.events.emitLater(event);
      }, options.reschedule);
    }
    if(callback) {
      callback(err);
    }
  });
}
