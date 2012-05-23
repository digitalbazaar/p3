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
var sqlite3 = require('sqlite3').verbose();

// constants
var MODULE_NAME = 'payswarm.database';
var MODULE_IRI = 'https://payswarm.com/modules/database';
var PAYSWARM_LOCAL_TABLE = 'payswarm_local_table';

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

// load distributed ID generator class
var DistributedIdGenerator =
  require('./payswarm.database.idGenerator').DistributedIdGenerator;

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
        fields: {namespace: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    // init machine-local database
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
    if(err || unopened.length === 0) {
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
  async.forEach(options, function(item, callback) {
    payswarm.db.collections[item.collection].ensureIndex(
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
    idGenerator.init,
    function(callback) {
      idGenerators[namespace] = idGenerator;
      callback(null, idGenerator);
    }
  ], callback);
};

/**
 * Initializes the machine-local database.
 *
 * @param callback(err) called once the operation completes.
 */
function _initLocalDatabase(callback) {
  async.waterfall([
    function(callback) {
      var db = new sqlite3.cached.Database(
        payswarm.config.database.local.path, function(err) {
          callback(err, db);
        });
    },
    function(db, callback) {
      db.run('CREATE TABLE IF NOT EXISTS $table ' +
        '(`key` TEXT PRIMARY KEY, `value` TEXT)',
        {$table: PAYSWARM_LOCAL_TABLE},
        function(err) {
          callback(err, db);
        });
    }
  ], function(err, db) {
    db.close();
    callback(err);
  });
}

/**
 * Sets a key-value pair in a machine-local database.
 *
 * @param key the unique key for the item.
 * @param value the value for the item.
 * @param callback(err) called once the operation completes.
 */
api.setLocalItem = function(key, value, callback) {
  async.waterfall([
    function(callback) {
      var db = new sqlite3.cached.Database(
        payswarm.config.database.local.path, function(err) {
          callback(err, db);
        });
    },
    function(db, callback) {
      if(value === null) {
        db.run('DELETE FROM $table WHERE `key`=$key',
          {$key: key},
          function(err) {
            callback(err, db);
          });
      }
      else {
        db.run('INSERT OR REPLACE INTO $table (`key`,`value`) ' +
          'VALUES ($key,$value)',
          {$key: key, $value: value},
          function(err) {
            callback(err, db);
          });
      }
    }
  ], function(err, db) {
    db.close();
    callback(err);
  });
};

/**
 * Atomically sets key-value pairs in a machine-local database.
 *
 * @param pairs an array of {key: k, value: v} pairs.
 * @param callback(err) called once the operation completes.
 */
api.setLocalItems = function(pairs, callback) {
  async.waterfall([
    function(callback) {
      // do not use cached database to ensure database is closed after
      // attempting a transaction
      var db = new sqlite3.Database(
        payswarm.config.database.local.path, function(err) {
          callback(err, db);
        });
    },
    function(db, callback) {
      db.run('BEGIN TRANSACTION', function(err) {
        callback(err, db);
      });
    },
    function(db, callback) {
      async.forEachSeries(pairs, function(pair, callback) {
        if(pair.value === null) {
          db.run('DELETE FROM $table WHERE `key`=$key',
            {$key: key}, callback);
        }
        else {
          db.run('INSERT OR REPLACE INTO $table (`key`,`value`) ' +
            'VALUES ($key,$value)',
            {$key: pair.key, $value: pair.value}, callback);
        }
      }, function(err) {
        callback(err, db);
      });
    },
    function(db, callback) {
      db.run('COMMIT TRANSACTION', function(err) {
        callback(err, db);
      });
    }
  ], function(err, db) {
    db.close();
    callback(err);
  });
};

/**
 * Gets the value for a key-value pair from a machine-local database.
 *
 * @param key the unique key for the item.
 * @param callback(err, value) called once the operation completes.
 */
api.getLocalItem = function(key, callback) {
  async.waterfall([
    function(callback) {
      var db = new sqlite3.cached.Database(
        payswarm.config.database.local.path, function(err) {
          callback(err, db);
        });
    },
    function(db, callback) {
      db.get('SELECT `value` FROM $table WHERE `key`=$key',
        {$key: key},
        function(err, row) {
          if(err) {
            return callback(err, db);
          }
          row = row || {value: null};
          callback(null, db, row.value);
        });
    }
  ], function(err, db, value) {
    db.close();
    callback(err, value);
  });
};

/**
 * Atomically finds and modifies the value for a key-value pair from a
 * machine-local database.
 *
 * Two callbacks must be passed to this method. The first, 'modifier', is
 * used to determine the newValue to replace the oldValue for the key. It
 * receives two parameters, the oldValue and a callback to be called with
 * two paramters: an error (null for none) and the newValue to use.
 *
 * The second callback that must be passed to this method will be called
 * once the operation completes.
 *
 * Use this method with caution, the database will be locked until the
 * callback passed to the 'modifier' callback is called. If an error
 * occurs such that the 'modifier' callback is never called, the database
 * will be not be locked.
 *
 * @param key the unique key for the item.
 * @param modifier(err, oldValue, cb(err, newValue)) called with the old value
 *          for the key.
 * @param callback(err) called once the operation completes.
 */
api.findAndModifyLocalItem = function(key, modifier, callback) {
  var db;
  async.waterfall([
    function(callback) {
      // do not use cached database to ensure database is closed after
      // attempting a transaction
      db = new sqlite3.Database(
        payswarm.config.database.local.path, callback);
    },
    function(callback) {
      db.run('BEGIN TRANSACTION', callback);
    },
    function(callback) {
      db.get('SELECT `value` FROM $table WHERE `key`=$key',
        {$key: key},
        function(err, row) {
          if(err) {
            return callback(err);
          }
          row = row || {value: null};
          modifier(row.value, callback);
        });
    },
    function(newValue, callback) {
      db.run('INSERT OR REPLACE INTO $table (`key`,`value`) ' +
        'VALUES ($key,$value)',
        {$key: key, $value: newValue},
        callback);
    },
    function(callback) {
      db.run('COMMIT TRANSACTION', callback);
    }
  ], function(err) {
    db.close();
    callback(err);
  });
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
