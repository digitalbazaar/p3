/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsdom = require('jsdom');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  logger: require('./payswarm.loggers').get('app'),
  tools: require('./payswarm.tools'),
  security: require('./payswarm.security')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var RDFa = require('./rdfa');
var request = require('request');

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
    api[name] = new ResourceStorage(name);
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

/**
 * Creates a ResourceStorage.
 *
 * @param name the name of the collection to use.
 */
function ResourceStorage(name) {
  this.name = name;
  this.frames = payswarm.tools.getDefaultJsonLdFrames();
}

/**
 * Get a value either from storage or by fetching it from the network. Using
 * only an id for a single resource will get the most current version of
 * that resource. Also specifying a hash will look for a specific stored
 * version of that resource info or ensure fetched data has the hash. The
 * query object has the following parameters:
 *
 * Single resource query parameters:
 *   id: The resource ID. (string)
 *   hash: The JSON-LD hash for the resource. (string, optional)
 *
 * Collection query parameters:
 *   start: Starting position. (number, default: 0)
 *
 * Common query parameters:
 *   num: Maximum number of results to return. (number, default: 1)
 *   fetch: Fetch remote resource if not already stored.
 *     (bool, default: false)
 *   store: Control if a fetched result is stored.
 *     (bool, default: use 'fetch' parameter value)
 *   strict: Fail if "num" results are not available. Used to easily check
 *     that at least one (or more) results are available without an
 *     additional check. (bool, default: false)
 *   type: Type of the resource as specified in the
 *     payswarm.common.Types configuration. Used for RDFa frame info.
 *
 * @param query a storage query.
 * @param callback(err, records) called once the operation completes.
 */
ResourceStorage.prototype.get = function(query, callback) {
  var self = this;

  // set query defaults
  if(!('store' in query)) {
    query.store = query.fetch || false;
  }
  if(!('errorOnNotFound' in query)) {
    query.errorOnNotFound = query.hash || false;
  }
  if(!('start' in query)) {
    query.start = 0;
  }
  if(!('num' in query)) {
    query.num = 1;
  }
  if(!('strict' in query)) {
    query.strict = false;
  }

  // FIXME: do not support collection queries for the time being
  if(!query.id) {
    return callback(new PaySwarmError(
      'Collection queries not implemented.',
      MODULE_TYPE + '.NotImplemented'));
  }

  // only allow a general query or fetching most recent
  if(query.fetch && (query.start !== 0 || query.num !== 1)) {
    return callback(new PaySwarmError(
      'Fetch mode only allowed when retrieving latest resource.',
      MODULE_TYPE + '.InvalidQuery'));
  }

  // check type in fetch mode
  if(query.fetch) {
    if(!query.type) {
      return callback(new PaySwarmError(
        'Missing type in fetch mode.',
        MODULE_TYPE + '.InvalidQuery'));
    }
    if(!(query.type in self.frames)) {
      return callback(new PaySwarmError(
        'Unknown type in fetch mode.',
        MODULE_TYPE + '.InvalidQuery', {type: query.type}));
    }
  }

  payswarm.logger.debug('ResourceStorage.get,', {
    collection: self.name, query: query
  });

  // build mongo query
  var q = {id: payswarm.db.hash(query.id)};
  if(query.hash) {
    q.hash = query.hash;
  }
  var options = {};
  if(query.hash) {
    options.limit = 1;
  }
  else {
    options.sort = {date: -1};
  }

  // do query + fetch if necessary and requested
  async.waterfall([
    function(callback) {
      payswarm.db.collections[self.name].find(
        q, {}, options).toArray(callback);
    },
    function(records, callback) {
      // nothing found, do fetch if requested
      if(records.length === 0 && query.fetch && query.id) {
        return self._fetch(query, callback);
      }
      callback(null, records);
    },
    function(records, callback) {
      if(records.length === 0 && query.strict) {
        return callback(new PaySwarmError(
          'Resource not found.',
          MODULE_TYPE + '.ResourceNotFound', {
            query: query}));
      }
      callback(null, records);
    }
  ], callback);
};

function _processHTML(query, data, callback) {
  async.waterfall([
    function(callback) {
      // FIXME: support more than HTML+RDFa
      jsdom.env({
        html: data,
        url: query.id,
        done: function(errors, window) {
          if(errors) {
            payswarm.logger.debug('ResourceStorage fetch errors:', errors);
            return callback(new PaySwarmError(
              'Could not fetch resource.',
              MODULE_TYPE + '.FetchError',
              {errors: errors}));
          }
          callback(null, window.document);
        }
      });
    },
    function(document, callback) {
      try {
        // extract JSON-LD from RDFa document
        RDFa.attach(document);
        jsonld.fromRDF(document.data, {format: 'rdfa-api'}, callback);
      }
      catch(ex) {
        return callback(new PaySwarmError(
          'Could not parse resource.',
          MODULE_TYPE + '.ParseError', null, ex));
      }
    },
  ], function(err, data) {
    callback(err, data);
  });
}

function _processJSON(data, callback) {
  async.waterfall([
  ], function(err, data) {
    callback(err, data);
  });
}

/**
 * Fetches the resource matching the given query from the network.
 *
 * @param query the query to use.
 * @param callback(err, records) called once the operation completes.
 */
ResourceStorage.prototype._fetch = function(query, callback) {
  var self = this;
  var now = new Date();

  async.waterfall([
    function(callback) {
      // get remote data and turn into processed JSON-LD
      request.get(
        {
          url: query.id,
          headers: {
            'Accept': 'application/json, text/html, application/xhtml+xml'
            // FIXME: support caching (copy from c++ code):
            //   If-None-Match: {etag}
            //   If-Modified-Since: {last-modified}
            // FIXME: use strictSSL?
          }
        },
        function(err, response, body) {
          if(err) {
            logger.error('Failed to fetch resource: ', err.toString());
            return callback(err);
          }
          if(!('content-type' in response.headers)) {
            return callback(new PaySwarmError(
                'Resource has no Content-Type.',
                MODULE_TYPE + '.NoContentType', {
                  query: query
                }));
          }
          var ct = response.headers['content-type'].split(';')[0];
          switch(ct) {
            case 'text/html':
            case 'application/xhtml+xml':
              _processHTML(query, response.body, callback);
              break;
            case 'application/json':
            case 'application/ld+json':
              _processJSON(query, response.body, callback);
              break;
          }
        }
      );
    },
    function(data, callback) {
      payswarm.logger.debug('ResourceStorage fetched data,', {
        collection: self.name, query: query
      });

      // frame data
      var frame = self.frames[query.type];
      jsonld.frame(data, frame, callback);
    },
    function(data, callback) {
      // FIXME: is this what we want? return first framing result?
      var context = data['@context'];
      data = data['@graph'][0];
      data['@context'] = context;

      // FIXME: run resource validator (must check signatures on listings!)
      callback(null, data);
    },
    function(data, callback) {
      // hash resource
      payswarm.security.hashJsonLd(data, function(err, hash) {
        callback(err, data, hash);
      });
    },
    function(data, hash, callback) {
      // resource w/hash not found
      if('hash' in query && (query.hash !== hash)) {
        return callback(null, []);
      }

      // build record
      var record = {
        id: payswarm.db.hash(query.id),
        hash: hash,
        date: now,
        resource: data
      };

      // not storing so return record
      if(!query.store) {
        return callback(null, [record]);
      }

      payswarm.logger.debug('ResourceStorage storing data,', {
        collection: self.name,
        query: query
      });

      // store record
      payswarm.db.collections[self.name].insert(
        record, payswarm.db.writeOptions, function(err, records) {
          /* Note: If a duplicate error was raised, then a race condition
            occurred where another operation already inserted the same
            record; this is ignored and the data is read back out. */
          if(payswarm.db.isDuplicateError(err)) {
            payswarm.db.collections[self.name].find(
              {id: record.id, hash: record.hash}, {},
              {limit: 1}).toArray(callback);
          }
          if(err) {
            return callback(err);
          }
          callback(err, records);
        });
    }
  ], function(err, records) {
    callback(err, records);
  });
};
