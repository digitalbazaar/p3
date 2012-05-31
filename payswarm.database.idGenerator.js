/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var mongo = require('mongodb');
var util = require('util');
var payswarm = {
  db: require('./payswarm.database'),
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools')
};

var api = {};
module.exports = api;

/**
 * A DistributedIdGenerator generates unique identifiers in a safe,
 * distributed, and fairly quick fashion. An ID that is generated using this
 * object should not conflict with any other ID generated using the same API
 * in the same ID namespace, even if that ID was generated on a different
 * machine.
 *
 * The underlying assumption that prevents ID collisions is that there is
 * a shared table (amongst all machines) with synchronized write access. This
 * table is only hit once the local ID namespace is exhausted, which should
 * be very rare.
 *
 * A distributed ID looks like:
 *
 * <version>.<globalId>.<localId>.<currentId>
 *
 * Where '.' is the reserved separator character. The global ID is stored
 * in a shared database and can only be updated atomically.
 *
 * The version is hardcoded to 1. The local ID can be any combination of
 * alphanumeric characters not including ".". The "." character was chosen
 * instead of "-" or "_" because those characters are used in URL-safe base64
 * encodings. This allows global ID and local ID parts to be encoded in base64,
 * however, they are encoded in hex in this implementation as is the current ID.
 */
api.DistributedIdGenerator = function() {
  this.namespace = null;
  this.globalId = null;
  this.localId = null;
  this.currentId = new Id64();
};

/**
 * Initializes this generator.
 *
 * @param namespace a unique namespace for the IDs.
 * @param callback(err) called once the operation completes.
 */
api.DistributedIdGenerator.prototype.init = function(namespace, callback) {
  var self = this;
  self.namespace = namespace;
  _loadIds(self, callback);
};

/**
 * Generates a new unique ID. The ID that is generated is URL-safe, but
 * is not itself a URL. It will be of the format "<hex>.<hex>.<hex>".
 *
 * @param callback(err, id) called once the operation completes.
 */
api.DistributedIdGenerator.prototype.generateId = function(callback) {
  var self = this;
  async.waterfall([
    function(callback) {
      // maximum ID reached, reload IDs
      if(self.currentId.isMax()) {
        _loadIds(self, callback);
      }
      else {
        callback();
      }
    },
    function(callback) {
      // get next ID
      // big-endian hex-encode ID
      // version is hard-coded to 1
      var id = util.format('1.%s.%s.%s',
        self.globalId.toHex(), self.localId.toHex(),
        self.currentId.next().toHex());
      callback(null, id);
    }
  ], callback);
};

/**
 * Loads the global and local IDs from machine-local storage, assigning a new
 * global ID and local ID as necessary.
 *
 * The global ID cached in local storage is shared amongst all machines
 * that share the sqlite database. The local ID in local storage represents
 * the last assigned local ID and it will be incremented and updated in
 * the database when this method is called. This method is only called on
 * initialization and once the current ID namespace is exhausted in a
 * particular process.
 *
 * @param idGenerator the ID generator load IDs for.
 * @param callback(err) called once the operation completes.
 */
function _loadIds(idGenerator, callback) {
  // reset current ID
  idGenerator.currentId = new Id64();

  // get keys for local storage
  var globalKey = 'payswarm.database.globalId:' + idGenerator.namespace;
  var localKey = 'payswarm.database.localId:' + idGenerator.namespace;

  async.waterfall([
    function(callback) {
      // try to get cached global ID from local storage
      payswarm.db.getLocalItem(globalKey, callback);
    },
    function(globalId, callback) {
      // global ID found in local storage cache
      if(globalId !== null) {
        idGenerator.globalId = new Id64(globalId);

        // just atomically update local ID and return
        return payswarm.db.findAndModifyLocalItem(localKey,
          function(old, callback) {
            idGenerator.localId = new Id64(old);
            if(idGenerator.localId.isMax()) {
              // local ID space exhausted, clear global ID, keep local ID
              globalId = null;
            }
            else {
              // get next local ID
              idGenerator.localId.next();
            }
            callback(null, idGenerator.localId.toHex());
          }, function(err) {
            if(err) {
              return callback(err);
            }
            // global ID not cleared, do callback, otherwise drop to below
            if(globalId !== null) {
              callback();
            }
          });
      }

      // no global ID yet, assign a new one
      payswarm.db.collections.distributedId.findAndModify(
        {namespace: idGenerator.namespace},
        [['_id','asc']],
        {$inc: {id: new mongo.Long(1)}},
        payswarm.tools.extend({}, payswarm.db.writeOptions,
          {'new': true, upsert: true}),
        function(err, record) {
          if(err) {
            return callback(err);
          }

          // atomically write new global ID and local ID to local storage
          idGenerator.globalId = new Id64(record.id);
          idGenerator.localId = new Id64(1);
          payswarm.db.setLocalItems([
            {key: globalKey, value: idGenerator.globalId.toHex()},
            {key: localKey, value: idGenerator.localId.toHex()}
          ], callback);
        });
    }
  ], callback);
}

/**
 * A 64-bit ID (emulated using two 32-bit numbers).
 *
 * @param low the low 32-bits.
 * @param high the high 32-bits.
 */
var Id64 = function() {
  this.low = this.high = 0;
  if(arguments.length > 0) {
    if(typeof arguments[0] === 'number') {
      this.low = arguments[0] & 0xffffffff;
      if(arguments.length > 1 && arguments[1] instanceof Number) {
        this.high = arguments[1] & 0xffffffff;
      }
    }
    else if(typeof arguments[0] === 'string') {
      this.low = parseInt(arguments[0].substr(8), 16);
      this.high = parseInt(arguments[0].substr(0, 8), 16);
    }
  }
};

/**
 * Gets the next ID.
 *
 * @return this ID for chaining.
 */
Id64.prototype.next = function() {
  if(this.low === 0xffffffff) {
    if(this.high === 0xffffffff) {
      // overflow
      this.high = this.low = 0;
    }
    else {
      this.high += 1;
      this.low = 0;
    }
  }
  else {
    this.low += 1;
  }
  return this;
};

/**
 * Returns true if this ID has reached its maximum value.
 *
 * @return true if this ID is the max ID value, false if not.
 */
Id64.prototype.isMax = function() {
  return this.high === 0xffffffff && this.low === 0xffffffff;
};

/**
 * Returns the 64-bit value of this ID in hex.
 *
 * @return the 64-bit value of this ID in hex.
 */
Id64.prototype.toHex = function() {
  // strip beginning zeros
  var hex = _u32toHex(this.high) + _u32toHex(this.low);
  return hex.replace(/^0+/, '');
};

/**
 * Converts an unsigned 32-bit number to zero-filled hex.
 *
 * @param u32 the number to convert.
 *
 * @return the hex representation of the number.
 */
function _u32toHex(u32) {
  var hex = u32.toString(16);
  return '0000000'.substr(0, 8 - hex.length) + hex;
}
