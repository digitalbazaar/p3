/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var child_process = require('child_process');
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
  // setup some logging optimization flags to avoid unneeded work
  // example: "if(_log.silly) { logger.silly(...); }"
  var _minLevel = Number.MAX_VALUE;
  Object.keys(logger.transports).forEach(function(name) {
    var t = logger.transports[name];
    _minLevel = Math.min(_minLevel, logger.levels[t.level]);
  });
  var _log = {};
  Object.keys(logger.levels).forEach(function(level) {
    _log[level] = _minLevel <= logger.levels[level];
  });

  var db = payswarm.db.collections;

  // init
  var _data = {
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

  // store last progress update to calculate delta
  var _lastProgress = {
    accountsSeen: 0,
    transactionsSeen: 0,
    accountsReconciled: 0,
    time: +new Date()
  };
  function _progress() {
    var now = +new Date();
    var td = (_data.stats.transactions.seen - _lastProgress.transactionsSeen);
    var tt = (now - _lastProgress.time) / 1000;
    var rem = (_data.stats.transactions.count - _data.stats.transactions.seen);
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
    if(_log.info) {
      logger.info(
        sprintf('Progress A:%d/%d T:%d/%d R:%d/%d T/s:%0.3f ETA:%s',
        _data.stats.accounts.seen, _data.stats.accounts.count,
        _data.stats.transactions.seen, _data.stats.transactions.count,
        _data.stats.accounts.reconciled, _data.stats.accounts.count,
        td/tt, etad));
    }
    // update last progress
    _lastProgress.transactionsSeen = _data.stats.transactions.seen;
    _lastProgress.accountsSeen = _data.stats.accounts.seen;
    _lastProgress.accountsReconciled = _data.stats.accounts.reconciled;
    _lastProgress.time = +new Date();
  }
  var _progressDelay = 1000;

  function _processAccounts(callback) {
    if(_log.info) {
      logger.info('Processing accounts.');
    }
    // read in all accounts
    // FIXME: live audit needs 'snapshot' option or similar functionality
    var q = {};
    if(options.account !== '*') {
      q = {
        'account.id': options.account
      };
    }
    db.account.find(q, {
      'account.id': true,
      'account.balance': true
    }, function(err, cursor) {
      if(err) {
        if(_log.error) {
          logger.error('Account find error.', {error: err});
        }
        return callback(err);
      }
      var progressId = null;
      if(options.progress) {
        progressId = setInterval(_progress, _progressDelay);
      }
      cursor.each(function(err, record) {
        if(err) {
          if(_log.error) {
            logger.error('Account iteration error.', {error: err});
          }
          return callback(err);
        }

        // no more records
        if(record === null) {
          if(options.progress) {
            clearInterval(progressId);
            _progress();
          }
          return callback();
        }

        if(_log.verbose) {
          logger.verbose('found account', {
            id: record.account.id,
            balance: record.account.balance
          });
        }
        _data.accounts[record.account.id] = {
          balance: new Money(record.account.balance)
        };
        _data.accountIds.push(record.account.id);

        // stats
        _data.stats.accounts.seen += 1;
        _data.stats.accounts.amount = _data.stats.accounts.amount.add(
          _data.accounts[record.account.id].balance);
        // FIXME: stats for in progress?
      });
    });
  }

  function _mapReduceTransactions(callback) {
    // iterate transactions and adjust accounts
    if(_log.info) {
      logger.info('Processing transactions.');
    }

    // map-reduce transactions
    var q = {};
    if(options.account !== '*') {
      q = {
        $or: [
          {'transaction.transfer.source': options.account},
          {'transaction.transfer.destination': options.account}
        ]
      };
    }
    db.transaction.find(q, {
      'transaction.id': true,
      'transaction.type': true,
      'transaction.settled': true,
      'transaction.voided': true,
      'transaction.transfer.destination': true,
      'transaction.transfer.source': true,
      'transaction.transfer.amount': true,
      'transaction.amount': true,
    }, function(err, cursor) {
      if(err) {
        if(_log.error) {
          logger.error('Txn find error.', {error: err});
        }
        return callback(err);
      }
      var progressId = null;
      if(options.progress) {
        progressId = setInterval(_progress, _progressDelay);
      }

      // create worker pool
      var pool = {
        workers: {}
      };
      pool.destroy = function() {
        for(var pid in pool.workers) {
          process.kill(pid);
        }
      };
      pool.send = function(worker, msg, data) {
        worker.send({type: msg, data: data || null});
      };

      // create cursor drainer (pull only 1 item at a time to prevent
      // invalid iteration)
      var nextQueue = async.queue(function(task, callback) {
        next(task.worker, callback);
      }, 1);

      // queues the next worker to receive a txn
      function queueNext(worker) {
        nextQueue.push({worker: worker});
      }

      var end = false;

      // start workers
      var workerCount = require('os').cpus().length;
      if(_log.info) {
        logger.info('Starting audit with ' + workerCount + ' worker' +
          (workerCount === 1 ? '' : 's') + '...');
      }
      for(var i = 0; i < workerCount; ++i) {
        (function(worker) {
          pool.workers[worker.pid] = worker;
          worker.on('message', function(msg) {
            if(msg.type === 'idle') {
              if(end) {
                pool.send(worker, 'end');
              }
              else {
                queueNext(worker);
              }
            }
            else if(msg.type === 'log') {
              if(_log[msg.data.level]) {
                logger.log(
                  msg.data.level, msg.data.message, JSON.parse(msg.data.meta));
              }
            }
            else if(msg.type === 'reduce') {
              reduce(JSON.parse(msg.data));
            }
          });
        })(child_process.fork(__dirname + '/audit-txn-worker.js'));
      }

      // get the next txn
      function next(worker, callback) {
        cursor.nextObject(function(err, record) {
          if(err) {
            if(_log.error) {
              logger.error('Txn iteration error.', {error: err});
            }
            pool.destroy();
            return callback(err);
          }

          // no more records
          if(record === null) {
            if(options.progress) {
              clearInterval(progressId);
              _progress();
            }
            end = true;
            pool.send(worker, 'end');
            return callback();
          }

          // update transaction stats
          _data.stats.transactions.seen += 1;
          var t = record.transaction;
          var info = _txnTypeInfo(t);
          if(_log.silly) {
            logger.silly(JSON.stringify(record, null, 2));
          }
          if(_log.verbose) {
            logger.verbose(sprintf('%s %s', status, info.type), {
              transaction: t.id,
              amount: t.amount
            });
          }

          // assign transaction to worker
          pool.send(worker, 'txn', {txn: t, info: info});

          // do some basic error reporting
          if(_log.error) {
            if(!t.settled && !t.voided) {
              // active
            }
            else if(t.voided) {
              // voided
            }
            else if(info.type === 'contract' || info.type === 'transfer') {
              // settled contract or transfer
              t.transfer.forEach(function(xfer) {
                if(!(xfer.source in _data.accounts)) {
                  logger.error(
                    sprintf('%s source account not found', info.type), {
                      transaction: t.id,
                      account: xfer.source
                    });
                  return callback();
                }
                if(!(xfer.destination in _data.accounts)) {
                  logger.error(
                    sprintf('%s destination account not found', info.type), {
                      transaction: t.id,
                      account: xfer.destination
                    });
                  return callback();
                }
              });
            }
            else if(info.type === 'deposit') {
              // settled deposit
              t.transfer.forEach(function(xfer) {
                if(!(xfer.destination in _data.accounts)) {
                  logger.error('deposit destination account not found', {
                    transaction: t.id,
                    account: xfer.destination
                  });
                  return callback();
                }
              });
            }
            else if(info.type === 'withdrawal') {
              // settled withdrawal
              t.transfer.forEach(function(xfer) {
                if(!(xfer.source in _data.accounts)) {
                  logger.error('withdrawal source account not found', {
                    transaction: t.id,
                    account: xfer.source
                  });
                  return callback();
                }
              });
            }
            else {
              logger.error('Unknown txn type found.', {
                transaction: t.id,
                type: t.type
              });
            }
          }

          callback();
        });
      } // end next

      var finished = 0;
      function reduce(workerData) {
        finished += 1;
        var masterData = _data;

        // combine accounts
        for(var id in workerData.accounts) {
          var acct = masterData.accounts[id];
          if(acct) {
            acct.balance = acct.balance.add(workerData.accounts[id].balance);
          }
        }

        // combine external accounts
        for(var id in workerData.external) {
          var acct = masterData.external[id];
          if(!acct) {
            masterData.external[id] = acct = {
              balance: new Money(0)
            };
          }
          acct.balance = acct.balance.add(workerData.external[id].balance);
        }

        // combine stats
        for(var status in workerData.stats) {
          var workerStats = workerData.stats[status];
          var masterStats = masterData.stats[status];
          for(var key in workerStats) {
            masterStats[key].count += workerStats[key].count;
            masterStats[key].amount = masterStats[key].amount.add(
              workerStats[key].amount);
          }
        }

        // all workers finished
        if(finished === workerCount) {
          pool.destroy();
          callback();
        }
      } // end reduce
    });
  } // end mapReduceTransactions

  function _reconcile(callback) {
    // reconcile
    if(_log.info) {
      logger.info('Reconciling.');
    }
    var progressId = null;
    if(options.progress) {
      progressId = setInterval(_progress, _progressDelay);
    }
    _data.accountIds.forEach(function(id) {
      var acct = _data.accounts[id];
      if(!acct.balance.isZero()) {
        var errorStats = _data.stats.accounts.errors;
        errorStats.count += 1;
        errorStats.amount = errorStats.amount.add(acct.balance);
        if(_log.error) {
          logger.error('Balance not zero!', {
            account: id,
            balance: acct.balance.toString()
          });
        }
      }
      _data.stats.accounts.reconciled += 1;
    });
    if(options.progress) {
      clearInterval(progressId);
      _progress(_data);
    }
    return callback();
  }

  function _report(callback) {
    if(_log.info) {
      // transactions report
      logger.info('Transactions Stats:',
        JSON.stringify(_data.stats, null, 2));
      // external accounts report
      logger.info('External Accounts:',
        JSON.stringify(_data.external, null, 2));
      // accounts balance report
      logger.info('Balance:', _data.stats.accounts.amount.toString());
    }
    // error report
    var errorStats = _data.stats.accounts.errors;
    if(errorStats.count > 0) {
      if(_log.error) {
        logger.error('Error Stats:',
          JSON.stringify(_data.stats.accounts.errors, null, 2));
      }
    }

    // result notification
    var errorStats = _data.stats.accounts.errors;
    if(errorStats.count > 0) {
      if(_log.error) {
        logger.error(
          'FAIL. Accounts with non-zero balances after reconciling.');
      }
    }
    else {
      if(_log.error) {
        logger.info(
          'PASS. All accounts have zero balances after reconciling.');
      }
    }
    callback();
  }

  async.waterfall([
    function(callback) {
      db.account.count(function(err, count) {
        _data.stats.accounts.count = count;
        if(_log.info) {
          logger.info('Auditing accounts.', {count: count});
        }
        callback();
      });
    },
    function(callback) {
      db.transaction.count(function(err, count) {
        _data.stats.transactions.count = count;
        if(_log.info) {
          logger.info('Auditing transactions.', {count: count});
        }
        callback();
      });
    },
    _processAccounts,
    _mapReduceTransactions,
    _reconcile,
    _report
  ], callback);
};

// TODO:
// audit txn amount vs payees
