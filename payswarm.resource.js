/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.resource';
var MODULE_IRI = 'https://payswarm.com/modules/resource';

// module API
var api = {};
api.name = MODULE_TYPE + '.Resource';
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      // open resource collections
      _openResourceCollections(['asset', 'listing', 'license'], callback);
    }
  ], callback);
};

function _openResourceCollections(names, callback) {
  async.forEachSeries(names, function(name, callback) {
    _openResourceCollection(name, callback);
  }, callback);
}

function _openResourceCollection(name, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.openCollections([name], callback);
    },
    function(callback) {
      // setup collection (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: name,
        fields: {id: 1, hash: 1},
        options: {unique: true, background: true}
      }, {
        collection: name,
        fields: {id: 1, date: true},
        options: {unique: false, background: true}
      }], callback);
    }
  ], callback);
}

/*
ExceptionRef e = new Exception(
    "Listing could not be found or retrieved.",
    PS_FINANCIAL ".InvalidListing");
 e->getDetails()["id"] = listingId;
 e->getDetails()["hash"] = listingHash;
 Exception::set(e);
 rval = false;
*/
