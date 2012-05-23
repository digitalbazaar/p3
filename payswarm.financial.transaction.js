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
    function openCollections(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['transaction'], callback);
    },
    function setupCollections(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'transaction',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'transaction',
        fields: {asset: 1, 'transaction.com:date': 1},
        options: {unique: false, background: true}
        // FIXME: add other indexes like assetAcquirer
      }], callback);
    },
    _registerPermissions,
    function getIdGenerator(callback) {
      payswarm.db.getDistributedIdGenerator('transaction',
        function(err, idGenerator) {
          if(!err) {
            transactionIdGenerator = idGenerator;
          }
          callback(err);
      });
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
 * @param callback(err) called once the operation completes.
 */
api.authorizeTransaction = function(transaction, callback) {
  async.waterfall([
    // 1. Insert pending transaction record.
    function(callback) {
      // FIXME: add asset index ... asset index for non-contracts will
      // contain transaction ID hash until sparse indexes on multiple
      // fields are supported in mongo
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(transaction['@id']),
        state: SETTLE_STATE.PENDING,
        updateId: 0,
        meta: {
          created: now,
          updated: now
        },
        transaction: transaction
      };
      payswarm.db.collections.transaction.insert(
        record, payswarm.db.writeOptions, callback);
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
          {id: payswarm.db.hash(dst)}, ['id'],
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
        // FIXME: fire an event to settle the transaction
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
    function(n, callback) {
      if(n === 0) {
        payswarm.db.collections.transaction.findOne(
          {id: transactionHash}, ['state'], payswarm.db.readOptions, callback);
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
          {}, payswarm.db.writeOptions,
          {upsert: true, 'new': true, fields: {'state': 1, 'settleId': 1}}),
        callback);
    },
    // 2. Get transaction state if no changes occurred.
    function(result, callback) {
      if(!result) {
        // findAndModify made no changes
        payswarm.db.collections.transaction.findOne(
          {id: transactionHash}, ['state'],
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
    function(n, callback) {
      payswarm.db.collections.transaction.findOne(
        {id: transactionHash}, ['state', 'settleId'],
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

// FIXME: update docs for this ...
/**
 * Populates the transactions associated with the given query.
 *
 * The query *must* contain "start" and "num" limitations. The query can
 * contain identity, account, asset, and license filtering information. It
 * can also specify a start and end date.
 *
 * start - the starting transaction index, 0 for the first one.
 * num - the maximum number of transactions to return.
 * identityId - the ID of the identity.
 * source - the source account ID.
 * destination - the destination account ID.
 * referenceId - the vendor-specified reference ID.
 * assetHash - the hash of the asset.
 * licenseHash - the hash of the license.
 * date.start - the starting date.
 * date.end - the ending date.
 * purchases - true to return only Contracts for a particular identityId,
 *    account query parameters will be ignored (default: false).
 * details - true to return the full details of the transaction (eg: full
 *    Contract details), (default: true).
 *
 * Advanced options:
 * assetIdxKey - the index key for the asset.
 * identityIdxKey - the index key for the identity.
 * accountSecIdxKey - the index key for the source account.
 * accountDstIdxKey - the index key for the destination account.
 *
 * @param actor the profile performing the action.
 * @param query the query.
 * @param result the result set with transactions.
 *
 * @return true on success, false on failure with exception set.
 */
api.getTransactions = function(actor, query, callback) {
  // FIXME: implement me

  // FIXME: until mongodb supports sparse multifield indexes, store the
  // transaction ID in the assetKey position for deposits, withdrawals, etc.
};

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
        ['updateId', 'account.com:balance'],
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
            // FIXME: fire event to clean up transaction
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
    function(n, callback) {
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
    function(n, callback) {
      if(n === 0) {
        // FIXME: fire event to clean up transaction
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
        ['updateId', 'account.com:balance'],
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
    function(n, callback) {
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
        {$set: {state: SETTLE_STATE.VOIDED, 'meta.updated': +new Date()}},
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
      function(n, callback) {
        if(n === 0) {
          payswarm.db.collections.transaction.findOne(
            {id: transactionHash}, ['state'],
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
        query, ['updateId', 'account.com:escrow', incoming],
        payswarm.db.readOptions, callback);
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
    function(n, callback) {
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
          {$set: {state: SETTLE_STATE.SETTLED, 'meta.updated': +new Date()}},
          payswarm.db.writeOptions, callback);
      },
      // if no update, get FT's state.
      function(n, callback) {
        if(n === 0) {
          payswarm.db.collections.transaction.findOne(
            {id: transactionHash}, ['state'],
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
        query,
        ['updateId', 'account.com:balance', 'account.com:escrow', incoming],
        payswarm.db.readOptions, callback);
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
    function(n, callback) {
      // if account not updated, try again
      if(n === 0) {
        return _settleDestinationAccount(
          transaction, settleId, dst, amount, callback);
      }
      callback();
    }
  ], callback);
}
