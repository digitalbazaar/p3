/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var assert = require('assert');
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.module('config'),
  constants: bedrock.module('config').constants,
  db: bedrock.module('bedrock.database'),
  financial: require('./financial'),
  money: require('./money'),
  tools: require('./tools')
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
api.init = function(options, collections, callback) {
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
      payswarm.db.openCollections(collections, callback);
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
  if(jsonld.hasValue(txn, 'type', 'Contract')) {
    return {type: 'contract', stats: 'contracts'};
  }
  if(jsonld.hasValue(txn, 'type', 'Deposit')) {
    return {type: 'deposit', stats: 'deposits'};
  }
  if(jsonld.hasValue(txn, 'type', 'Withdrawal')) {
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
    } else {
      // FIXME: simplify
      var days = Math.floor(eta / (60*60*24));
      eta = eta % (60*60*24);
      var hours = Math.floor(eta / (60*60));
      eta = eta % (60*60);
      var mins = Math.floor(eta / 60);
      var secs = eta % 60;
      if(days) {
        etad = sprintf('%dd,%dh,%dm,%ds', days, hours, mins, secs);
      } else if(hours) {
        etad = sprintf('%dh,%dm,%ds', hours, mins, secs);
      } else if(mins) {
        etad = sprintf('%dm,%ds', mins, secs);
      } else {
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
      if(options.progress) {
        var progressId = setInterval(_progress, _progressDelay);
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

  function _processTransactions(callback) {
    // iterate transactions and adjust accounts
    if(_log.info) {
      logger.info('Processing transactions.');
    }
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
      'transaction.amount': true
    }, function(err, cursor) {
      if(err) {
        if(_log.error) {
          logger.error('Txn find error.', {error: err});
        }
        return callback(err);
      }
      if(options.progress) {
        var progressId = setInterval(_progress, _progressDelay);
      }
      cursor.each(function(err, record) {
        if(err) {
          if(_log.error) {
            logger.error('Txn iteration error.', {error: err});
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

        _data.stats.transactions.seen += 1;
        var t = record.transaction;
        var info = _txnTypeInfo(t);
        var stats = _data.stats;
        if(_log.silly) {
          logger.silly(JSON.stringify(record, null, 2));
        }
        // helper function for common logging and stats
        function _process(status) {
          if(_log.verbose) {
            logger.verbose(sprintf('%s %s', status, info.type), {
              transaction: t.id,
              amount: t.amount
            });
          }
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
            if(!(xfer.source in _data.accounts)) {
              if(_log.error) {
                logger.error(
                  sprintf('%s source account not found', info.type), {
                    transaction: t.id,
                    account: xfer.source
                  });
              }
              return;
            }
            if(!(xfer.destination in _data.accounts)) {
              if(_log.error) {
                logger.error(
                  sprintf('%s destination account not found', info.type), {
                    transaction: t.id,
                    account: xfer.destination
                  });
              }
              return;
            }

            // reverse the xfer
            var src = _data.accounts[xfer.source];
            src.balance = src.balance.add(xfer.amount);
            var dest = _data.accounts[xfer.destination];
            dest.balance = dest.balance.subtract(xfer.amount);
          });
        } else if(info.type === 'deposit') {
          // settled deposit
          _process('settled');
          t.transfer.forEach(function(xfer) {
            if(!(xfer.destination in _data.accounts)) {
              if(_log.error) {
                logger.error('deposit destination account not found', {
                  transaction: t.id,
                  account: xfer.destination
                });
              }
              return;
            }

            // reverse the xfer
            var dest = _data.accounts[xfer.destination];
            dest.balance = dest.balance.subtract(xfer.amount);

            // track external xfer
            // this is always an external id for a deposit
            var src = _data.external[xfer.source];
            // if not found, create it
            if(!src) {
              if(_log.verbose) {
                logger.verbose('found external deposit source', {
                  id: xfer.source
                });
              }
              _data.external[xfer.source] = src = {
                balance: new Money(0)
              };
            }
            src.balance = src.balance.add(xfer.amount);
          });
        } else if(info.type === 'withdrawal') {
          // settled withdrawal
          _process('settled');
          t.transfer.forEach(function(xfer) {
            if(!(xfer.source in _data.accounts)) {
              if(_log.error) {
                logger.error('withdrawal source account not found', {
                  transaction: t.id,
                  account: xfer.source
                });
              }
              return;
            }

            // reverse the xfer
            var src = _data.accounts[xfer.source];
            src.balance = src.balance.add(xfer.amount);

            // track external xfer
            // if not a known account, then assume external
            // this can be to an external id or internal account for fees
            // FIXME: check for local authority baseUri prefix?
            var dest = _data.accounts[xfer.destination];
            if(!dest) {
              // id is external
              dest = _data.external[xfer.destination];
              // if not found, create it
              if(!dest) {
                if(_log.verbose) {
                  logger.verbose('found external withdrawal destination', {
                    id: xfer.destination
                  });
                }
                _data.external[xfer.destination] = dest = {
                  balance: new Money(0)
                };
              }
            }
            dest.balance = dest.balance.subtract(xfer.amount);
          });
        } else {
          if(_log.error) {
            logger.error('Unknown txn type found.', {
              transaction: t.id,
              type: t.type
            });
          }
        }
      });
    });
  }

  function _reconcile(callback) {
    // reconcile
    if(_log.info) {
      logger.info('Reconciling.');
    }
    var progressId;
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
    // stringify accounts Money
    _data.stats.accounts.amount =
      _data.stats.accounts.amount.toString();
    _data.stats.accounts.errors.amount =
      _data.stats.accounts.errors.amount.toString();
    // stringify external accounts Money
    Object.keys(_data.external).forEach(function(id) {
      var ext = _data.external[id];
      ext.balance = ext.balance.toString();
    });
    // stringify transactions Money
    ['active', 'settled', 'voided'].forEach(function(type) {
      var t = _data.stats[type];
      ['contracts', 'deposits', 'transfers', 'withdrawals'].forEach(
        function(ttype) {
        var tt = t[ttype];
        tt.amount = tt.amount.toString();
      });
    });

    if(_log.info) {
      // transactions report
      logger.info('Transactions Stats:',
        JSON.stringify(_data.stats, null, 2));
      // external accounts report
      logger.info('External Accounts:',
        JSON.stringify(_data.external, null, 2));
      // accounts balance report
      logger.info('Balance:', _data.stats.accounts.amount);
    }
    // error report and result notification
    var errorStats = _data.stats.accounts.errors;
    if(errorStats.count > 0) {
      if(_log.error) {
        logger.error('Error Stats:',
          JSON.stringify(_data.stats.accounts.errors, null, 2));
        logger.error(
          'FAIL. Accounts with non-zero balances after reconciling.');
      }
    } else {
      if(_log.info) {
        logger.info(
          'PASS. All accounts have zero balances after reconciling.');
      }
    }
    callback();
  }

  var db = payswarm.db.collections;
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
    _processTransactions,
    _reconcile,
    _report
  ], callback);
};

/**
 * Validate database data.
 *
 * @param options validation options.
 * @param progress function to call for progress feedback.
 * @param callback callback when done. Called with error on error or null on
 *        success.
 */
api.validate = function(options, query, callback) {
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

  var collections = [
    'account',
    'asset',
    'budget',
    'contractCache',
    'distributedId',
    'identity',
    'license',
    'listing',
    'paymentToken',
    'profile',
    'promo',
    'promoCodeRedemption',
    'publicKey',
    'session',
    'transaction'
  ];

  // init
  var _stats = {};
  var _lastProgress = {};
  collections.forEach(function(value) {
    _stats[value] = {
      count: 0,
      seen: 0,
      errors: 0
    };
    // store last progress update to calculate delta
    _lastProgress[value] = {
      seen: 0,
      time: +new Date()
    };
  });

  function _progress(collection) {
    var _s = _stats[collection];
    var _p = _lastProgress[collection];
    var now = +new Date();
    var td = (_s.seen - _p.seen);
    var tt = (now - _p.time) / 1000;
    var rem = (_s.count - _s.seen);
    var eta = Math.ceil(rem / (td / tt));
    var etad;
    // if more than a year, just use the date
    if(eta > (60*60*24*365)) {
      etad = new Date(eta * 1000).toDateString();
    } else {
      // FIXME: simplify
      var days = Math.floor(eta / (60*60*24));
      eta = eta % (60*60*24);
      var hours = Math.floor(eta / (60*60));
      eta = eta % (60*60);
      var mins = Math.floor(eta / 60);
      var secs = eta % 60;
      if(days) {
        etad = sprintf('%dd,%dh,%dm,%ds', days, hours, mins, secs);
      } else if(hours) {
        etad = sprintf('%dh,%dm,%ds', hours, mins, secs);
      } else if(mins) {
        etad = sprintf('%dm,%ds', mins, secs);
      } else {
        etad = secs + 's';
      }
    }
    if(_log.info) {
      logger.info(
        sprintf(collection + ' progress:%d/%d err:%d obj/s:%0.3f ETA:%s',
        _s.seen, _s.count, _s.errors, td/tt, etad));
    }
    // update last progress
    _p.seen = _s.seen;
    _p.time = +new Date();
  }
  var _progressDelay = 1000;

  /**
   * Validate a collection.
   *
   * @param options
   *          collection collection name.
   *          validate validate(obj) validate object and return true/false
   *          callback(err) with error or null when done.
   * @param callback callback(err) call when done with error or null.
   */
  function _validateCollection(pcOptions, callback) {
    assert(pcOptions.collection);
    assert(pcOptions.validate);
    var collection = pcOptions.collection;
    if(_log.info) {
      logger.info('Processing collection:', collection);
    }
    async.waterfall([
      function(callback) {
        db[collection].count(function(err, count) {
          callback(err, count);
        });
      },
      function(count, callback) {
        _stats[collection].count = count;
        if(_log.info) {
          logger.info('Validating ' + collection + '.', {count: count});
        }
        callback();
      },
      function(callback) {
        db[collection].find({}, {}, callback);
      },
      function(cursor, callback) {
        if(options.progress) {
          var progressId = setInterval(function() {
            _progress(collection);
          }, _progressDelay);
        }
        cursor.each(function(err, record) {
          if(err) {
            return callback({
              type: 'iteration',
               error: err
            });
          }

          // no more records
          if(record === null) {
            if(options.progress) {
              clearInterval(progressId);
              _progress(collection);
            }
            return callback();
          }

          //if(_log.verbose) {
          //  logger.verbose('found ' + collection + ':', record);
          //}

          // stats
          _stats[collection].seen += 1;

          // validate
          try {
            pcOptions.validate(record);
          } catch(ex) {
            if(_log.error) {
              logger.error('ERROR', ex);
            }
            _stats[collection].errors += 1;
          }
        });
      }
    ], function(err) {
      if(err) {
        _log.error(collection + ' validation error:', {error: err});
      }
      callback(err);
    });
  }

  function _report(callback) {
    var errors = 0;
    collections.forEach(function(value) {
      errors += _stats[value].errors;
      if(_log.info) {
        logger.info(value + ' stats:',
          JSON.stringify(_stats[value], null, 2));
      }
    });

    // error report and result notification
    if(errors > 0) {
      if(_log.error) {
        logger.error('FAIL. Errors found:', errors);
      }
    } else {
      if(_log.info) {
        logger.info(
          'PASS. No errors found.');
      }
    }
    callback();
  }

  function _ldcheck(ld, type) {
    assert('@context' in ld, {
      id: ld.id,
      message: 'missing context'
    });
    assert(ld['@context'] === payswarm.constants.CONTEXT_URL, {
      id: ld.id,
      message: 'not default context',
      context: ld['@context']
    });
    if(type) {
      assert(jsonld.hasValue(ld, 'type', type), {
        id: ld.id,
        message: 'missing type',
        type: type,
        types: ld.type
      });
    }
    // Check other types for compact uris?
    //jsonld.getValues(ld, 'type').forEach(function(type) {
    //  assert(!(':' in type));
    //});
  }

  var db = payswarm.db.collections;
  async.waterfall([
    function(callback) {
      _validateCollection({
        collection: 'account',
        validate: function(obj) {
          _ldcheck(obj.account, 'FinancialAccount');
        }
      }, callback);
    },
    function(callback) {
      // TODO: asset
      callback();
    },
    function(callback) {
      _validateCollection({
        collection: 'budget',
        validate: function(obj) {
          _ldcheck(obj.budget, 'Budget');
        }
      }, callback);
    },
    function(callback) {
     // TODO contractCache
     callback();
    },
    function(callback) {
     // TODO distributedId
     callback();
    },
    function(callback) {
     // TODO identity
     callback();
    },
    function(callback) {
     // TODO license
     callback();
    },
    function(callback) {
     // TODO listing
     callback();
    },
    function(callback) {
     // TODO paymentToken
      _validateCollection({
        collection: 'paymentToken',
        validate: function(obj) {
          //_ldcheck(obj.paymentToken, 'PaymentToken');
          var t = obj.paymentToken;
          assert(jsonld.hasProperty(t, 'sysTokenHash'), {
            id: t.id,
            message: 'missing tokenHash'
          });
        }
      }, callback);
    },
    function(callback) {
     // TODO profile
     callback();
    },
    function(callback) {
     // TODO promo
     callback();
    },
    function(callback) {
     // TODO promoCodeRedemption
     callback();
    },
    function(callback) {
      _validateCollection({
        collection: 'publicKey',
        validate: function(obj) {
          _ldcheck(obj.publicKey, 'CryptographicKey');
        }
      }, callback);
     callback();
    },
    function(callback) {
     // TODO session
     callback();
    },
    function(callback) {
      _validateCollection({
        collection: 'transaction',
        validate: function(obj) {
          _ldcheck(obj.transaction, 'Transaction');
        }
      }, callback);
    },
    _report
  ], callback);
};

// TODO:
// audit txn amount vs payees
