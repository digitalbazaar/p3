/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var util = require('util');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  money: require('./payswarm.money')
};
var sprintf = require('sprintf').sprintf;
var Money = payswarm.money.Money;

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
      // init database
      payswarm.db.init(null, callback);
    },
    function(callback) {
      // init financial modules
      //payswarm.financial.init(null, callback);
      payswarm.db.openCollections(['account', 'transaction'], callback);
    }
  ], callback);
};

/**
 * Audit account data.
 *
 * @param options audit options.
 * @param query filter data to audit.
 * @param progress function to call for progress feedback.
 * @param callback callback when done. Called with error on error or null on
 *        success.
 */
api.accounts = function(options, query, callback) {
  var logger = options.logger || console.log;

  // store last progress update to calculate delta
  var _lastProgress = {
    accountsSeen: 0,
    transactionsSeen: 0,
    accountsReconciled: 0,
    time: +new Date()
  };
  function _progress(data) {
    var now = +new Date();
    var td = (data.counts.transactionsSeen - _lastProgress.transactionsSeen);
    var tt = (now - _lastProgress.time) / 1000;
    logger.info(sprintf('Progress A:%d/%d T:%d/%d R:%d/%d T/s:%0.3f',
      data.counts.accountsSeen, data.counts.accounts,
      data.counts.transactionsSeen, data.counts.transactions,
      data.counts.accountsReconciled, data.counts.accounts,
      td/tt));
    // update last progress
    _lastProgress.transactionsSeen = data.counts.transactionsSeen;
    _lastProgress.accountsSeen = data.counts.accountsSeen;
    _lastProgress.accountsReconciled = data.counts.accountsReconciled;
    _lastProgress.time = +new Date();
  }
  var _progressDelay = 5000;

  var db = payswarm.db.collections;
  async.waterfall([
    function(callback) {
      // init
      var data = {
        accounts: {},
        accountIds: [],
        counts: {
          accounts: 0,
          accountsSeen: 0,
          accountsReconciled: 0,
          accountErrors: 0,
          transactions: 0,
          transactionsSeen: 0,
          active: 0,
          settled: 0,
          voided: 0,
          contracts: 0,
          deposits: 0,
          withdrawals: 0
        },
        money: {
          balance: new Money(0),
          amount: new Money(0),
          voided: new Money(0),
          contracts: new Money(0),
          deposits: new Money(0),
          withdrawals: new Money(0)
        }
      };
      callback(null, data);
    },
    function(data, callback) {
      db.account.count(function(err, count) {
        data.counts.accounts = count;
        logger.info('Auditing accounts.', {count: count});
        callback(null, data);
      });
    },
    function(data, callback) {
      db.transaction.count(function(err, count) {
        data.counts.transactions = count;
        logger.info('Auditing transactions.', {count: count});
        callback(null, data);
      });
    },
    function(data, callback) {
      logger.info('Processing accounts.');
      // read in all accounts
      // FIXME: live audit needs 'snapshot' option or similar functionality
      db.account.find({}, {
        'account.id': true,
        'account.balance': true
      }, function(err, cursor) {
        if(err) {
          logger.error('Account find error.', {error: err});
          return callback(err);
        }
        if(options.verbose) {
          var progressId = setInterval(_progress, _progressDelay, data);
        }
        cursor.each(function(err, record) {
          if(err) {
            logger.error('Account iteration error.', {error: err});
            return callback(err);
          }
          if(record !== null) {
            data.accounts[record.account.id] = {
              balance: new Money(record.account.balance)
            };
            data.accountIds.push(record.account.id);

            // stats
            data.counts.accountsSeen += 1;
            data.money.balance = data.money.balance.add(
              data.accounts[record.account.id].balance);
            // FIXME: stats for in progress?
          } else {
            if(options.verbose) {
              clearInterval(progressId);
              _progress(data);
            }
            callback(null, data);
          }
        });
      });
    },
    function(data, callback) {
      // iterate transactions and adjust accounts
      logger.info('Processing transactions.');
      db.transaction.find({}, {
        'transaction.type': true,
        'transaction.settled': true,
        'transaction.voided': true,
        'transaction.transfer': true,
        'transaction.amount': true,
      }, function(err, cursor) {
        if(err) {
          logger.error('Txn find error.', {error: err});
          return callback(err);
        }
        if(options.verbose) {
          var progressId = setInterval(_progress, _progressDelay, data);
        }
        cursor.each(function(err, record) {
          if(err) {
            logger.error('Txn iteration error.', {error: err});
            return callback(err);
          }
          if(record !== null) {
            data.counts.transactionsSeen += 1;
            var t = record.transaction;
            //console.log(JSON.stringify(record, null, 2));
            data.counts.settled += (t.settled ? 1 : 0);
            data.counts.voided += (t.voided ? 1 : 0);
            if(!t.settled && !t.voided) {
              // skip, in progress
              data.counts.active += 1;
            } else if(t.voided) {
              // skip, voided
              data.money.voided = data.money.voided.add(t.amount);
            } else if(jsonld.hasValue(t, 'type', 'ps:Contract')) {
              data.counts.contracts += 1;
              data.money.amount = data.money.amount.add(t.amount);
              data.money.contracts =
                data.money.contracts.add(t.amount);
              for(var i = 0, len = t.transfer.length; i < len; i++) {
                var xfer = t.transfer[i];
                // reverse the xfer
                data.accounts[xfer.source].balance =
                  data.accounts[xfer.source].balance.add(xfer.amount);
                data.accounts[xfer.destination].balance =
                  data.accounts[xfer.destination].balance.subtract(xfer.amount);
              }
            } else if(jsonld.hasValue(t, 'type', 'com:Deposit')) {
              data.counts.deposits += 1;
              data.money.amount = data.money.amount.add(t.amount);
              data.money.deposits =
                data.money.deposits.add(t.amount);
              for(var i = 0, len = t.transfer.length; i < len; i++) {
                var xfer = t.transfer[i];
                // reverse the xfer
                data.accounts[xfer.destination].balance =
                  data.accounts[xfer.destination].balance.subtract(xfer.amount);
                // FIXME: add stats for total ext xfer amount
              }
            } else if(jsonld.hasValue(t, 'type', 'com:Withdrawal')) {
              data.counts.withdrawals += 1;
              data.money.amount = data.money.amount.add(t.amount);
              data.money.withdrawals =
                data.money.withdrawals.add(t.amount);
              logger.error('FIXME: handle withdrawal');
            } else {
              logger.error('Unknown txn type found.', {type: t.type});
            }
          } else {
            if(options.verbose) {
              clearInterval(progressId);
              _progress(data);
            }
            callback(null, data);
          }
        });
      });
    },
    function(data, callback) {
      // reconcile
      logger.info('Reconciling.');
      if(options.verbose) {
        var progressId = setInterval(_progress, _progressDelay, data);
      }
      for(var i = 0, len = data.accountIds.length; i < len; i++) {
        var id = data.accountIds[i];
        var acct = data.accounts[id];
        if(!acct.balance.isZero()) {
          data.counts.accountErrors += 1;
          logger.error('Balance not zero!', {
            accountId: id,
            balance: acct.balance.toString()
          });
        }
        data.counts.accountsReconciled += 1;
      }
      if(options.verbose) {
        clearInterval(progressId);
        _progress(data);
      }
      return callback(null, data);
    },
    function(data, callback) {
      // stats
      // stringify Money
      var keys = ['balance', 'amount', 'contracts', 'deposits',
        'withdrawals', 'voided'];
      for(var i in keys) {
        var key = keys[i];
        data.money[key] = data.money[key].toString();
      }
      logger.info('Counts.', data.counts);
      logger.info('Money.', data.money);
      if(data.counts.accountErrors > 0) {
        logger.info('FAIL. Accounts with non-zero balances after ' +
          'reconciling: ' + data.counts.accountErrors);
      }
      else {
        logger.info(
          'PASS. All accounts have zero balances after reconciling.');
      }
      callback(null, data);
    }
  ], callback);
};

// TODO:
// audit txn amount vs payees
