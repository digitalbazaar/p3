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
  var db = payswarm.db.collections;
  async.waterfall([
    function(callback) {
      // init
      var data = {
        counts: {},
        accounts: {},
        accountIds: []
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
      db.account.find(function(err, cursor) {
        if(err) {
          logger.error("Account find error.", {error: err});
          return callback(err);
        }
        cursor.each(function(err, acct) {
          if(err) {
            logger.error("Account iteration error.", {error: err});
            return callback(err);
          }
          if(acct !== null) {
            data.accounts[acct.account.id] = {
              balance: new Money(acct.account.balance),
              escrow: new Money(acct.account.escrow)
            };
            data.accountIds.push(acct.account.id);

            // FIXME: hack, add deposit txns when creating non-zero accounts
            data.accounts[acct.account.id].balance =
              data.accounts[acct.account.id].balance.subtract(new Money("10"));
          } else {
            callback(null, data);
          }
        });
      });
    },
    function(data, callback) {
      // iterate transactions and adjust accounts
      logger.info('Processing transactions.');
      db.transaction.find(function(err, cursor) {
        if(err) {
          logger.error("Txn find error.", {error: err});
          return callback(err);
        }
        cursor.each(function(err, txn) {
          if(err) {
            logger.error("Txn iteration error.", {error: err});
            return callback(err);
          }
          if(txn !== null) {
            //console.log(txn.transaction.id);
            var t = txn.transaction;
            //console.log(JSON.stringify(txn, null, 2));
            if(jsonld.hasValue(t, 'type', 'ps:Contract')) {
              for(var i = 0, len = t.transfer.length; i < len; i++) {
                var xfer = t.transfer[i];
                var amount = new Money(xfer.amount);
                // reverse the xfer
                data.accounts[xfer.source].balance =
                  data.accounts[xfer.source].balance.add(amount);
                data.accounts[xfer.destination].balance =
                  data.accounts[xfer.destination].balance.subtract(amount);
              }
            } else if(jsonld.hasValue(t, 'type', 'com:Deposit')) {
              for(var i = 0, len = t.transfer.length; i < len; i++) {
                var xfer = t.transfer[i];
                var amount = new Money(xfer.amount);
                // reverse the xfer
                data.accounts[xfer.destination].balance =
                  data.accounts[xfer.destination].balance.subtract(amount);
                // FIXME: add stats for total ext xfer amount
              }
            } else if(jsonld.hasValue(t, 'type', 'com:Withdrawal')) {
              logger.error('FIXME: handle withdrawal');
            } else {
              logger.error('Unknown txn type found.', {type: t.type});
            }
          } else {
            callback(null, data);
          }
        });
      });
    },
    function(data, callback) {
      // reconcile
      logger.info('Reconciling.');
      for(var i = 0, len = data.accountIds.length; i < len; i++) {
        var id = data.accountIds[i];
        var acct = data.accounts[id];
        if(!acct.balance.isZero()) {
          logger.error('Balance not zero!', {
            accountId: id,
            balance: acct.balance.toString()
          });
        }
        if(!acct.escrow.isZero()) {
          logger.error('Escrow not zero!', {
            accountId: id,
            escrow: acct.escrow.toString()
          });
        }
      }
      return callback(null, data);
    }
  ], callback);
};

// TODO:
// audit txn amount vs payees
