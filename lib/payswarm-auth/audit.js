/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var util = require('util');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  money: require('./money')
};
var sprintf = require('sprintf').sprintf;
var Money = payswarm.money.Money;

var api = {};
module.exports = api;

/**
 * Initializes this module.
 *
 * @param options global audit options
 * @param callback(err) called once the operation completes.
 */
api.init = function(options, callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      // load custom configs
      if(options.config) {
        require(options.config);
      }
      callback();
    },
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
 * Return short names for transaction type and stats.
 *
 * @param txn a transaction
 * @return txn type info {type: ..., stats: ...}
 */
var _txnTypeInfo = function(txn) {
  if(jsonld.hasValue(txn, 'type', 'ps:Contract')) {
    return {type: 'contract', stats: 'contracts'};
  }
  if(jsonld.hasValue(txn, 'type', 'com:Deposit')) {
    return {type: 'deposit', stats: 'deposits'};
  }
  if(jsonld.hasValue(txn, 'type', 'com:Withdrawal')) {
    return {type: 'withdrawal', stats: 'withdrawals'};
  }
  // FIXME: is this a valid assumption?
  // assume internal transfers only
  return {type: 'transfer', stats: 'transfer'};
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
    var td = (data.stats.transactions.seen - _lastProgress.transactionsSeen);
    var tt = (now - _lastProgress.time) / 1000;
    var rem = (data.stats.transactions.count - data.stats.transactions.seen);
    var eta = Math.ceil(rem / (td / tt));
    var etad;
    // if more than a year, just use the date
    if(eta > (60*60*24*365)) {
      etad = new Date(eta * 1000).toDateString();
    }
    else {
      // FIXME: simplify
      var days = Math.floor(eta / (60*60*24));
      eta = eta % (60*60*24);
      var hours = Math.floor(eta / (60*60));
      eta = eta % (60*60);
      var mins = Math.floor(eta / 60);
      var secs = eta % 60;
      if(days) {
        etad = sprintf('%dd,%dh,%dm,%ds', days, hours, mins, secs);
      }
      else if(hours) {
        etad = sprintf('%dh,%dm,%ds', hours, mins, secs);
      }
      else if(mins) {
        etad = sprintf('%dm,%ds', mins, secs);
      }
      else {
        etad = secs + 's';
      }
    }
    logger.info(
      sprintf('Progress A:%d/%d T:%d/%d R:%d/%d T/s:%0.3f ETA:%s',
      data.stats.accounts.seen, data.stats.accounts.count,
      data.stats.transactions.seen, data.stats.transactions.count,
      data.stats.accounts.reconciled, data.stats.accounts.count,
      td/tt, etad));
    // update last progress
    _lastProgress.transactionsSeen = data.stats.transactions.seen;
    _lastProgress.accountsSeen = data.stats.accounts.seen;
    _lastProgress.accountsReconciled = data.stats.accounts.reconciled;
    _lastProgress.time = +new Date();
  }
  var _progressDelay = 1000;

  var db = payswarm.db.collections;
  async.waterfall([
    function(callback) {
      // init
      var data = {
        accounts: {},
        accountIds: [],
        external: {},
        stats: {
          accounts: {
            count: 0,
            amount: new Money(0),
            seen: 0,
            reconciled: 0,
            errors: {count: 0, amount: new Money(0)}
          },
          transactions: {
            count: 0,
            seen: 0
          },
          active: {
            contracts: {count: 0, amount: new Money(0)},
            deposits: {count: 0, amount: new Money(0)},
            transfers: {count: 0, amount: new Money(0)},
            withdrawals: {count: 0, amount: new Money(0)}
          },
          settled: {
            contracts: {count: 0, amount: new Money(0)},
            deposits: {count: 0, amount: new Money(0)},
            transfers: {count: 0, amount: new Money(0)},
            withdrawals: {count: 0, amount: new Money(0)}
          },
          voided: {
            contracts: {count: 0, amount: new Money(0)},
            deposits: {count: 0, amount: new Money(0)},
            transfers: {count: 0, amount: new Money(0)},
            withdrawals: {count: 0, amount: new Money(0)}
          }
        }
      };
      callback(null, data);
    },
    function(data, callback) {
      db.account.count(function(err, count) {
        data.stats.accounts.count = count;
        logger.info('Auditing accounts.', {count: count});
        callback(null, data);
      });
    },
    function(data, callback) {
      db.transaction.count(function(err, count) {
        data.stats.transactions.count = count;
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
        if(options.progress) {
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
            data.stats.accounts.seen += 1;
            data.stats.accounts.amount = data.stats.accounts.amount.add(
              data.accounts[record.account.id].balance);
            // FIXME: stats for in progress?
          } else {
            if(options.progress) {
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
        'transaction.id': true,
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
        if(options.progress) {
          var progressId = setInterval(_progress, _progressDelay, data);
        }
        cursor.each(function(err, record) {
          if(err) {
            logger.error('Txn iteration error.', {error: err});
            return callback(err);
          }
          if(record !== null) {
            data.stats.transactions.seen += 1;
            var t = record.transaction;
            var info = _txnTypeInfo(t);
            var stats = data.stats;
            logger.silly(JSON.stringify(record, null, 2));
            // helper function for common logging and stats
            function _process(status) {
              logger.verbose(sprintf('%s %s', status, info.type), {
                transaction: t.id,
                amount: t.amount
              });
              var s = stats[status][info.stats];
              s.count += 1;
              s.amount = s.amount.add(t.amount);
            }
            if(!t.settled && !t.voided) {
              // active
              _process('active');
            } else if(t.voided) {
              // voided
              _process('voided');
            } else if(info.type === 'contract' || info.type === 'transfer') {
              // settled contract or transfer
              _process('settled');
              t.transfer.forEach(function(xfer) {
                if(!(xfer.source in data.accounts)) {
                  logging.error(
                    sprintf('%s source account not found', info.type), {
                      transaction: t.id,
                      account: xfer.source
                    });
                  return;
                }
                if(!(xfer.destination in data.accounts)) {
                  logging.error(
                    sprintf('%s destination account not found', info.type), {
                      transaction: t.id,
                      account: xfer.destination
                    });
                  return;
                }

                // reverse the xfer
                var src = data.accounts[xfer.source];
                src.balance = src.balance.add(xfer.amount);
                var dest = data.accounts[xfer.destination];
                dest.balance = dest.balance.subtract(xfer.amount);
              });
            } else if(info.type === 'deposit') {
              // settled deposit
              _process('settled');
              t.transfer.forEach(function(xfer) {
                if(!(xfer.destination in data.accounts)) {
                  logging.error('deposit destination account not found', {
                    transaction: t.id,
                    account: xfer.destination
                  });
                  return;
                }

                // reverse the xfer
                var dest = data.accounts[xfer.destination];
                dest.balance = dest.balance.subtract(xfer.amount);

                // track external xfer
                // this is always an external id for a deposit
                var src = data.external[xfer.source];
                // if not found, create it
                if(!src) {
                  logger.verbose('found external deposit source', {
                    id: xfer.source
                  });
                  data.external[xfer.source] = src = {
                    balance: new Money(0)
                  };
                }
                src.balance = src.balance.add(xfer.amount);
              });
            } else if(info.type === 'withdrawal') {
              // settled withdrawal
              _process('settled');
              t.transfer.forEach(function(xfer) {
                if(!(xfer.source in data.accounts)) {
                  logging.error('withdrawal source account not found', {
                    transaction: t.id,
                    account: xfer.source
                  });
                  return;
                }

                // reverse the xfer
                var src = data.accounts[xfer.source];
                src.balance = src.balance.add(xfer.amount);

                // track external xfer
                // if not a known account, then assume external
                // this can be to an external id or internal account for fees
                // FIXME: check for local authority baseUri prefix?
                var dest = data.accounts[xfer.destination];
                if(!dest) {
                  // id is external
                  dest = data.external[xfer.destination];
                  // if not found, create it
                  if(!dest) {
                    logger.verbose('found external withdrawal destination', {
                      id: xfer.destination
                    });
                    data.external[xfer.destination] = dest = {
                      balance: new Money(0)
                    };
                  }
                }
                dest.balance = dest.balance.subtract(xfer.amount);
              });
            } else {
              logger.error('Unknown txn type found.', {
                transaction: t.id,
                type: t.type
              });
            }
          } else {
            if(options.progress) {
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
      if(options.progress) {
        var progressId = setInterval(_progress, _progressDelay, data);
      }
      data.accountIds.forEach(function(id) {
        var acct = data.accounts[id];
        if(!acct.balance.isZero()) {
          var errorStats = data.stats.accounts.errors;
          errorStats.count += 1;
          errorStats.amount = errorStats.amount.add(acct.balance);
          logger.error('Balance not zero!', {
            account: id,
            balance: acct.balance.toString()
          });
        }
        data.stats.accounts.reconciled += 1;
      });
      if(options.progress) {
        clearInterval(progressId);
        _progress(data);
      }
      return callback(null, data);
    },
    function(data, callback) {
      // stringify accounts Money
      data.stats.accounts.amount =
        data.stats.accounts.amount.toString();
      data.stats.accounts.errors.amount =
        data.stats.accounts.errors.amount.toString();
      // stringify external accounts Money
      Object.keys(data.external).forEach(function(id) {
        var ext = data.external[id];
        ext.balance = ext.balance.toString();
      });
      // stringify transactions Money
      ['active', 'settled', 'voided'].forEach(function(type) {
        var t = data.stats[type];
        ['contracts', 'deposits', 'transfers', 'withdrawals'].forEach(
          function(ttype) {
          var tt = t[ttype];
          tt.amount = tt.amount.toString();
        });
      });

      // transactions report
      logger.info('Transactions Stats:', JSON.stringify(data.stats, null, 2));
      // external accounts report
      logger.info('External Accounts:', JSON.stringify(data.external, null, 2));
      // accounts balance report
      logger.info('Balance:', data.stats.accounts.amount);
      // error report
      var errorStats = data.stats.accounts.errors;
      if(errorStats.count > 0) {
        logger.error('Error Stats:',
          JSON.stringify(data.stats.accounts.errors, null, 2));
      }

      // result notification
      var errorStats = data.stats.accounts.errors;
      if(errorStats.count > 0) {
        logger.error(
          'FAIL. Accounts with non-zero balances after reconciling.');
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
