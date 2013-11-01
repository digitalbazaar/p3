/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 *
 * This file exposes an API for accessing the shared and local databases
 * for a PaySwarm Authority. This API is mostly used to communicate with
 * the shared database -- this database is sharded (or will be) and replicated
 * across multiple machines. Any shared collections are exposed via this
 * module's 'collections' property.
 *
 * The API also exposes a single document in a local database. This database
 * is not sharded or replicated to other machines. It has a single collection
 * with a single document that can be updated atomically. The expectation is
 * that very little data needs to be stored locally (eg: local parts of
 * distributed IDs, etc.). This module exposes the local collection via
 * the 'localCollection' property. The single local document in that
 * collection has two properties: 'id' and 'local'. The value of 'id'
 * is exposed by this module as 'localDocumentId'. The value of 'local' is
 * a JSON object where local properties should be stored.
 */
var async = require('async');
var crypto = require('crypto');
var mongo = require('mongodb');
var payswarm = {
  config: require('../config'),
  logger: require('./loggers').get('app'),
  tools: require('./tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.database';
var MODULE_IRI = 'https://payswarm.com/modules/database';

// exceptions
var MDBE_ERROR = 'MongoError';
var MDBE_DUPLICATE = 11000;

// module API
var api = {};
api.name = MODULE_TYPE + '.Database';
module.exports = api;

// database client(s)
api.client = null;
api.localClient = null;

// shared collections cache
api.collections = {};

// local collection
api.localCollection = null;
// local document ID
api.localDocumentId = 'local';

// default database write options
api.writeOptions = payswarm.config.database.writeOptions;
api.localWriteOptions = payswarm.config.database.local.writeOptions;

// load distributed ID generator class
var DistributedIdGenerator =
  require('./database.idGenerator').DistributedIdGenerator;

// id generators
var idGenerators = {};

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
    // open connection to shared database
    function(callback) {
      payswarm.logger.info('connecting to database: mongodb://' +
        payswarm.config.database.host + ':' +
        payswarm.config.database.port + '/' +
        payswarm.config.database.name);
      api.client.open(function(err) {
        if(!err) {
          payswarm.logger.info('connected to database: mongodb://' +
            payswarm.config.database.host + ':' +
            payswarm.config.database.port + '/' +
            payswarm.config.database.name);
        }
        callback(err);
      });
    },
    function(callback) {
      api.client.authenticate(
        payswarm.config.database.username,
        payswarm.config.database.password, function(err) {
          callback(err);
        });
    },
    function(callback) {
      // open collections
      api.openCollections(['distributedId'], callback);
    },
    function(callback) {
      // setup indexes
      api.createIndexes([{
        collection: 'distributedId',
        fields: {namespace: true},
        options: {unique: true, background: true}
      }], callback);
    },
    // init machine-local (non-replicated) database
    _initLocalDatabase
  ], callback);
};

/**
 * Opens any collections in the given list that aren't already open.
 *
 * @param names the names of the collections to open.
 * @param callback(err) called once the operation completes.
 */
api.openCollections = function(names, callback) {
  // remove collections that are already open
  var unopened = [];
  names.forEach(function(name) {
    if(!(name in api.collections)) {
      unopened.push(name);
    }
  });

  // create collections as necessary (ignore already exists error)
  async.forEach(unopened, function(name, callback) {
    payswarm.logger.info('creating collection: ' + name);
    api.client.createCollection(name, api.writeOptions,
      function ignoreAlreadyExists(err) {
        if(err && api.isAlreadyExistsError(err)) {
          err = null;
        }
        else if(!err) {
          payswarm.logger.info('collection created: ' + name);
        }
        callback(err);
    });
  // now open the collections
  }, function openCollections(err) {
    if(err || unopened.length === 0) {
      callback(err);
    }
    else {
      // build async request
      var collections = {};
      names.forEach(function(name) {
        if(!(name in api.collections)) {
          collections[name] = function(callback) {
            api.client.collection(name, callback);
          };
        }
      });

      // open collections
      payswarm.logger.info('opening collections', names);
      async.parallel(collections, function(err, results) {
        if(err) {
          callback(err);
        }
        else {
          // merge results into collection cache
          for(var name in results) {
            if(!(name in api.collections)) {
              payswarm.logger.info('collection open: ' + name);
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
  if(typeof key !== 'string') {
    throw new PaySwarmError(
      'Invalid key given to database hash method.',
      MODULE_TYPE + '.InvalidKey', {key: key});
  }
  var md = crypto.createHash('sha1');
  md.update(key, 'utf8');
  return md.digest('hex') + key.length.toString(16);
};

/**
 * Builds an update object using mongodb dot-notation.
 *
 * @param obj the object with fields to be updated in the database.
 * @param [field] optional parent field.
 * @param options options for building the update:
 *          include: dot-delimited fields to include, any not listed will be
 *            excluded.
 *          exclude: dot-delimited fields to exclude.
 *
 * @return the update object to be assigned to $set in an update query.
 */
api.buildUpdate = function(obj) {
  var options = null;
  var field = '';
  if(typeof arguments[1] === 'object') {
    options = arguments[1];
  }
  else {
    if(typeof arguments[1] === 'string') {
      field = arguments[1];
    }
    if(typeof arguments[2] === 'object') {
      options = arguments[2];
    }
  }
  options = options || {};
  var rval = arguments[3] || {};
  if('exclude' in options && options.exclude.indexOf(field) !== -1) {
    return rval;
  }
  if('include' in options && field.indexOf('.') !== -1 &&
    options.include.indexOf(field) === -1) {
    return rval;
  }
  if(obj && typeof obj === 'object' && !Array.isArray(obj)) {
    // for objects, recurse for each field
    Object.keys(obj).forEach(function(name) {
      api.buildUpdate(obj[name], (field.length > 0) ?
        field + '.' + name : name, options, rval);
    });
  }
  else {
    rval[field] = obj;
  }
  return rval;
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
  async.forEach(options, function(item, callback) {
    api.collections[item.collection].ensureIndex(
      item.fields, item.options, callback);
  }, callback);
};

/**
 * Gets the DistributedIdGenerator for the given namespace. If the
 * DistributedIdGenerator object does not exist, it will be created.
 *
 * @param namespace the ID namespace.
 * @param callback(err, idGenerator) called once the operation completes.
 */
api.getDistributedIdGenerator = function(namespace, callback) {
  if(namespace in idGenerators) {
    return callback(null, idGenerators[namespace]);
  }

  // create and initialize ID generator
  var idGenerator = new DistributedIdGenerator();
  async.waterfall([
    function(callback) {
      idGenerator.init(namespace, callback);
    },
    function(callback) {
      idGenerators[namespace] = idGenerator;
      callback(null, idGenerator);
    }
  ], callback);
};

/**
 * Encodes any keys in the given value that contain reserved MongoDB
 * characters.
 *
 * @param value the value to encode.
 *
 * @return the encoded result.
 */
api.encode = function(value) {
  var rval;
  if(Array.isArray(value)) {
    rval = [];
    value.forEach(function(e) {
      rval.push(api.encode(e));
    });
  }
  else if(payswarm.tools.isObject(value)) {
    rval = {};
    Object.keys(value).forEach(function(name) {
      // percent-encode '%' and illegal mongodb key characters
      var key = name
        .replace('/%/g', '%25')
        .replace('/$/g', '%24')
        .replace('/./g', '%2E');
      rval[key] = api.encode(value[name]);
    });
  }
  else {
    rval = value;
  }
  return rval;
};

/**
 * Decodes any keys in the given value that were previously encoded because
 * they contained reserved MongoDB characters (or the '%' encode character).
 *
 * @param value the value to decode.
 *
 * @return the decoded result.
 */
api.decode = function(value) {
  var rval;
  if(Array.isArray(value)) {
    rval = [];
    value.forEach(function(e) {
      rval.push(api.decode(e));
    });
  }
  else if(payswarm.tools.isObject(value)) {
    rval = {};
    Object.keys(value).forEach(function(name) {
      rval[decodeURIComponent(name)] = api.decode(value[name]);
    });
  }
  else {
    rval = value;
  }
  return rval;
};

/**
 * Initializes the machine-local (non-replicated) database.
 *
 * @param callback(err) called once the operation completes.
 */
function _initLocalDatabase(callback) {
  // create db client for local database
  api.localClient = new mongo.Db(
    payswarm.config.database.local.name, new mongo.Server(
      payswarm.config.database.host, payswarm.config.database.port,
      payswarm.config.database.connectOptions),
      payswarm.config.database.options);

  // local collection name
  var name = payswarm.config.database.local.collection;

  async.waterfall([
    // open connection to local database
    function(callback) {
      payswarm.logger.info('connecting to database: mongodb://' +
        payswarm.config.database.host + ':' +
        payswarm.config.database.port + '/' +
        payswarm.config.database.local.name);
      api.localClient.open(function(err) {
        if(!err) {
          payswarm.logger.info('connected to database: mongodb://' +
            payswarm.config.database.host + ':' +
            payswarm.config.database.port + '/' +
            payswarm.config.database.local.name);
        }
        callback(err);
      });
    },
    function(callback) {
      api.localClient.authenticate(
        payswarm.config.database.username,
        payswarm.config.database.password, function(err) {
          callback(err);
        });
    },
    function(callback) {
      // create local collection
      api.localClient.createCollection(name, api.localWriteOptions,
        function ignoreAlreadyExists(err) {
          if(err && api.isAlreadyExistsError(err)) {
            err = null;
          }
          else if(!err) {
            payswarm.logger.info('local collection created: ' + name);
          }
          callback(err);
      });
    },
    function(callback) {
      // open local collection
      api.localClient.collection(name, callback);
    },
    function(collection, callback) {
      // cache local collection
      api.localCollection = collection;

      // create index
      api.localCollection.ensureIndex(
        {id: true}, {unique: true, background: true}, function(err) {
          callback(err);
        });
    },
    function(callback) {
      // insert local document
      var record = {id: api.localDocumentId, local: {}};
      api.localCollection.insert(record, api.localWriteOptions,
        function(err) {
          // ignore duplicate errors
          if(err && api.isDuplicateError(err)) {
            err = null;
          }
          callback(err);
      });
    }
  ], callback);
}

/**
 * Returns true if the given error is a MongoDB 'already exists' error.
 *
 * @param err the error to check.
 *
 * @return true if the error is a 'already exists' error, false if not.
 */
api.isAlreadyExistsError = function(err) {
  return (err && err.message && err.message.indexOf('already exists') !== -1);
};

/**
 * Returns true if the given error is a MongoDB duplicate key error.
 *
 * @param err the error to check.
 *
 * @return true if the error is a duplicate key error, false if not.
 */
api.isDuplicateError = function(err) {
  return (api.isDatabaseError(err) && err.code === MDBE_DUPLICATE);
};

/**
 * Returns true if the given error is a MongoDB error.
 *
 * @param err the error to check.
 *
 * @return true if the error is a duplicate key error, false if not.
 */
api.isDatabaseError = function(err) {
  return (err && err.name === MDBE_ERROR);
};

/**
 * A helper method for incrementing cycling update IDs.
 *
 * @param updateId the current update ID.
 *
 * @return the new update ID.
 */
api.getNextUpdateId = function(updateId) {
  return (updateId < 0xffffffff) ? (updateId + 1) : 0;
};
