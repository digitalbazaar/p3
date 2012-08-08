/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var jsonld = require('jsonld');
var db = require('../../lib/payswarm-auth/payswarm.database.js')

// FIXME: change to proper config for system you are running on
//require('/etc/payswarm/staging.payswarm.dev.config');
//require('/etc/payswarm/dev.payswarm.com.config');

/**
 * Initialize payswarm infrastructure.
 *
 * @param callback(err) called when done
 */
exports.init = function(callback) {
  db.init(null, callback);
};

/**
 * Cleanup payswarm infrastructure.
 *
 * @param callback(err) called when done
 */
exports.cleanup = function(callback) {
  async.parallel([
    function(callback) {
      db.client.close(callback);
    },
    function(callback) {
      db.localClient.close(callback);
    }
  ], callback);
};

/**
 * Run mutate function on every element of a table.
 *
 * options:
 *   collection: database collection (string)
 *   ready: function called before processing (function)
 *   update: function called for each element to edit in place (function(item))
 *   callback: called when done (function(err, results))
 *     results: FIXME object with processing results, etc
 */
exports.each = function(options) {
  async.auto({
    collection: function(callback, results) {
      // open collections
      db.openCollections([options.collection], function(err) {
        if(err) {
          return callback(err);
        }
        callback(null, db.collections[options.collection])
      });
    },
    ready: ['collection', function(callback, results) {
      if('ready' in options) {
        options.ready();
      }
      callback();
    }],
    process: ['ready', function(callback, results) {
      results.collection.find({}, function(err, cursor) {
        if(err) {
          return callback(err);
        }
        var done = false;
        async.until(function() {return done;}, function(callback) {
          cursor.nextObject(function(err, record) {
            if(err) {
              return callback(err);
            }
            if(!record) {
              done = true;
              return callback();
            }
            options.update(record);
            results.collection.update({_id: record._id}, record, callback);
          });
        }, callback);
      });
    }],
    done: ['process', function(callback, results) {
      callback();
    }]
  }, function(err, results) {
    if(err) {
      console.log('ERROR', err);
    }
    if('callback' in options) {
      options.callback(null, results);
    }
  });
};

// log uncaught exception and exit
process.on('uncaughtException', function(err) {
  logger.error(
    err.toString(), err.stack ? {stack: err.stack} : null);
  process.removeAllListeners('uncaughtException');
  process.exit();
});
