/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var mongo = require('mongodb');
var payswarm = {
  logger: require('./payswarm.logger'),
  config: require('./payswarm.config')
};

// constants
var MODULE_NAME = 'payswarm.database';
var MODULE_IRI = 'https://payswarm.com/modules/database';

// exceptions
var MDBE_ERROR = 'MongoError';
var MDBE_DUPLICATE = 11000;

// module API
var api = {};
api.name = MODULE_NAME;
module.exports = api;

// database client
api.client = null;

// collections cache
api.collections = {};

// default database read/write options
api.readOptions = payswarm.config.database.readOptions;
api.writeOptions = payswarm.config.database.writeOptions;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // create database client
  api.client = new mongo.Db(
    payswarm.config.database.name, new mongo.Server(
      payswarm.config.database.host, payswarm.config.database.port,
      payswarm.config.database.connectOptions),
      payswarm.config.database.options);

  // do initialization work
  async.waterfall([
    // open connection to database
    function connect(callback) {
      payswarm.logger.log('connecting to database: mongodb://' +
        payswarm.config.database.host + ':' +
        payswarm.config.database.port + '/' +
        payswarm.config.database.name);
      api.client.open(function connected(err, client) {
        if(!err) {
          payswarm.logger.log('connected to database: mongodb://' +
            payswarm.config.database.host + ':' +
            payswarm.config.database.port + '/' +
            payswarm.config.database.name);
        }
        callback(err, client);
      });
    }
  ], callback);
};

/**
 * Opens any collections in the given list that aren't already open.
 *
 * @param names the names of the collections to open.
 * @param callback(err) called once the operation completes.
 */
api.openCollections = function(names, callback) {
  // create collections as necessary (ignore already exists error)
  async.forEach(names, function(name, callback) {
    payswarm.logger.log('creating collection: ' + name);
    api.client.createCollection(name, api.writeOptions,
      function ignoreAlreadyExists(err) {
        if(err && api.isAlreadyExistsError(err)) {
          err = null;
        }
        else {
          payswarm.logger.log('collection created: ' + name);
        }
        callback(err);
    });
  // now open the collections
  }, function openCollections(err) {
    if(err) {
      callback(err);
    }
    else {
      // build async request
      var collections = {};
      for(var i = 0; i < names.length; ++i) {
        if(!(names[i] in api.collections)) {
          (function(name) {
            collections[name] = function(callback) {
              api.client.collection(name, api.readOptions, callback);
            };
          })(names[i]);
        }
      }

      // open collections
      payswarm.logger.log('opening collections: ' + JSON.stringify(names));
      async.parallel(collections, function(err, results) {
        if(err) {
          callback(err);
        }
        else {
          // merge results into collection cache
          for(var name in results) {
            if(!(name in api.collections)) {
              payswarm.logger.log('collection open: ' + name);
              api.collections[name] = results[name];
            }
          }
          callback(null);
        }
      });
    }
  });
};

/**
 * Creates a hash of a key that can be indexed.
 *
 * @param key the key to hash.
 *
 * @return the hash.
 */
api.hash = function(key) {
  var md = crypto.createHash('sha1');
  md.update(key);
  return md.digest('hex') + key.length.toString(16);
};

/**
 * Builds an update object using mongodb dot-notation.
 *
 * @param obj the object with fields to be updated in the database.
 *
 * @return the update object to be assigned to $set in an update query.
 */
api.buildUpdate = function(obj) {
  var rval = arguments[1] || {};
  var field = arguments[2] || '';
  if(typeof obj === 'object' && !(obj instanceof Array)) {
    // for objects, recurse for each field
    Object.keys(obj).forEach(function(name) {
      buildUpdate(obj[name], rval, (field.length > 0) ?
        field + '.' + name : name);
    });
  }
  else {
    rval[field] = obj;
  }
};

/**
 * Creates indexes.
 *
 * @param options an array of:
 *          collection: <collection_name>,
 *          fields: <collection_fields>,
 *          options: <index_options>
 * @param callback(err) called once the operation completes.
 */
api.createIndexes = function(options, callback) {
  async.forEachSeries(options, function(item, callback) {
    payswarm.db.collections[item.collection].ensureIndex(
      item.fields, item.options, callback);
  }, callback);
};

/**
 * Returns true if the given error is a MongoDB 'already exists' error.
 *
 * @param err the error to check.
 *
 * @return true if the error is a 'already exists' error, false if not.
 */
api.isAlreadyExistsError = function(err) {
  return (err.message && err.message.indexOf('already exists') !== -1);
};

/**
 * Returns true if the given error is a MongoDB duplicate key error.
 *
 * @param err the error to check.
 *
 * @return true if the error is a duplicate key error, false if not.
 */
api.isDuplicateError = function(err) {
  return (err.name === MDBE_ERROR && err.code === MDBE_DUPLICATE);
};
