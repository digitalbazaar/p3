#!/usr/bin/env node
/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var fixdb = require('./fix-db');
var jsonld = require('jsonld');

/**
 * Fix privacy properties:
 *
 * Before:
 *   accounts have psaPrivacy set to 'public' or 'private'
 * After:
 *   public accounts set psaPublic to ['label', 'owner']
 *   private accounts set psaPublic to []
 *   identities set psaPublic to []
 */
function _fixAccountPrivacy(callback) {
  fixdb.each({
    collection: 'account',
    ready: function() {
      console.log('Fix account privacy options.');
    },
    update: function(record) {
      var account = record.account;
      console.log('A', account.id);
      // check if conversion already done
      if(!jsonld.hasProperty(account, 'psaPublic')) {
        // only mark properties public if psaPrivacy was formerly 'public'
        if(jsonld.hasValue(account, 'psaPrivacy', 'public')) {
          account.psaPublic = ['label', 'owner'];
        }
        else {
          account.psaPublic = [];
        }
      }
      delete account.psaPrivacy;
    },
    callback: function(err, results) {
      if(!err) {
        console.log('Accounts done.');
      }
      callback(err);
    }
  });
}

/**
 * Fix privacy properties:
 *
 * Before:
 *   no psaPublic property
 * After:
 *   psaPublic set to []
 */
function _fixIdentityPrivacy(callback) {
  fixdb.each({
    collection: 'identity',
    ready: function() {
      console.log('Fix identity privacy options.');
    },
    update: function(record) {
      var identity = record.identity;
      console.log('I', identity.id);
      // check if conversion already done
      // use key check vs hasProperty since we are forcing []
      if(!('psaPublic' in identity)) {
        identity.psaPublic = [];
      }
    },
    callback: function(err, results) {
      if(!err) {
        console.log('Identities done.');
      }
      callback(err);
    }
  });
}

/**
 * Fix transaction dates:
 *
 * Before:
 *   created is a timestamp
 * After:
 *   created is a Date
 */
var tcnt = 0;
function _fixTxnDates(callback) {
  fixdb.each({
    collection: 'transaction',
    ready: function() {
      console.log('Fix transaction dates.');
    },
    update: function(record) {
      tcnt++;
      console.log('T', tcnt, record.transaction.id);
      record.created = new Date(record.created);
    },
    callback: function(err, results) {
      if(!err) {
        console.log('Transactions done.');
      }
      callback(err);
    }
  });
}

/**
 * Fix contractCache dates:
 *
 * Before:
 *   expires is a timestamp
 * After:
 *   expires is a Date
 */
function _fixContractCacheDates(callback) {
  fixdb.each({
    collection: 'contractCache',
    ready: function() {
      console.log('Fix contractCache dates.');
    },
    update: function(record) {
      console.log('CC', record.contract.id);
      record.expires = new Date(record.expires);
    },
    callback: function(err, results) {
      if(!err) {
        console.log('contractCache done.');
      }
      callback(err);
    }
  });
}

async.series([
  fixdb.init,
  _fixAccountPrivacy,
  _fixIdentityPrivacy,
  _fixTxnDates,
  _fixContractCacheDates,
  fixdb.cleanup
]);
