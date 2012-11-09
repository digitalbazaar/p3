/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var jsdom = require('jsdom');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  security: require('./security'),
  tools: require('./tools'),
  validation: require('./validation')
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

// options for creating resource storages
var resourceOptions = [{
  name: 'asset',
  validator: _validateAsset
}, {
  name: 'license',
  validator: _validateLicense
}, {
  name: 'listing',
  validator: _validateListing
}];

// HACK: until payswarm v1 context URL returns the correct context,
// use the built-in
var oldResolver = jsonld.urlResolver;
jsonld.urlResolver = function(url, callback) {
  if(url === 'http://purl.org/payswarm/v1') {
    return callback(
      null, {'@context': payswarm.tools.getDefaultJsonLdContext()});
  }
  oldResolver(url, callback);
};

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
      _openResourceCollections(resourceOptions, callback);
    }
  ], callback);
};

function _openResourceCollections(options, callback) {
  async.forEachSeries(options, function(opts, callback) {
    api[opts.name] = new ResourceStorage(opts);
    _openResourceCollection(opts.name, callback);
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
        fields: {id: 1, date: 1},
        options: {unique: false, background: true}
      }], callback);
    }
  ], callback);
}

/**
 * Creates a ResourceStorage.
 *
 * @param options the options to use.
 *          name the name of the collection to use to store resources.
 *          [validator] a validator to use to validate resources (must
 *            implement 'validate(resource, callback(err))'.
 */
function ResourceStorage(options) {
  this.name = options.name;
  this.validator = options.validator || null;
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
 *     common.Types configuration. Used for RDFa frame info.
 *   validate: Validate resource even if it is not fetched but loaded from
 *     storage (Note: validation will always be run on the first fetch).
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
    query.errorOnNotFound = ('hash' in query);
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
  if(!('validate' in query)) {
    query.validate = false;
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
      // decode reserved mongodb characters, restore full @context
      records.forEach(function(record) {
        record.resource = payswarm.db.decode(record.resource);
        record.resource['@context'] = payswarm.tools.getDefaultJsonLdContext();
      });
      if(records.length === 0 && query.strict) {
        return callback(new PaySwarmError(
          'Resource not found.',
          MODULE_TYPE + '.ResourceNotFound', {
            query: query}));
      }
      callback(null, records);
    },
    function(records, callback) {
      if(!query.validate) {
        return callback(null, records);
      }

      // validate each record
      async.forEach(records, function(record, callback) {
        self.validate(record.resource, callback);
      }, function(err) {
        callback(err, records);
      });
    }
  ], callback);
};

/**
 * Validates the given resource.
 *
 * @param resource the resource.
 * @param callback(err) called once the operation completes.
 */
ResourceStorage.prototype.validate = function(resource, callback) {
  // run resource validator if available
  if(this.validator) {
    return this.validator(resource, callback);
  }
  callback();
};

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
      request.get({
        url: query.id,
        headers: {
          'Accept':
            'application/json, text/html, application/xhtml+xml; charset=utf-8'
          // FIXME: support caching (copy from c++ code):
          //   If-None-Match: {etag}
          //   If-Modified-Since: {last-modified}
        },
        jar: false
      }, function(err, response, body) {
        if(err) {
          payswarm.logger.error('Failed to fetch resource: ', err.toString());
          return callback(err);
        }
        if(!('content-type' in response.headers)) {
          return callback(new PaySwarmError(
            'Resource has no Content-Type.',
            MODULE_TYPE + '.NoContentType', {query: query}));
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
      });
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
      var context = data['@context'] || {};
      data = data['@graph'][0] || {};
      data['@context'] = context;

      // validate resource
      self.validate(data, function(err) {
        callback(err, data);
      });
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
        // encode reserved mongodb characters, use @context URL
        resource: payswarm.tools.extend(
          payswarm.db.encode(data),
          {'@context': payswarm.tools.getDefaultJsonLdContextUrl()})
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
            return payswarm.db.collections[self.name].find(
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

/**
 * Processes a resource query that resulted in an HTML response. On success,
 * the result returned in the callback will be parsed JSON.
 *
 * @param query the resource query.
 * @param data the HTML data.
 * @param callback(err, result) called once the operation completes.
 */
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

/**
 * Processes a resource query that resulted in a JSON response. On success,
 * the result returned in the callback will be parsed JSON.
 *
 * @param query the resource query.
 * @param data the JSON data.
 * @param callback(err, result) called once the operation completes.
 */
function _processJSON(query, data, callback) {
  try {
    var json = JSON.parse(data);
    callback(null, json);
  }
  catch(ex) {
    return callback(new PaySwarmError(
      'Could not parse resource.',
      MODULE_TYPE + '.ParseError', null, ex));
  }
}

/**
 * Validates an Asset.
 *
 * @param asset the Asset to validate.
 * @param callback(err) called once the operation completes.
 */
function _validateAsset(asset, callback) {
  async.waterfall([
    function(callback) {
      payswarm.validation.validate('resources.asset', asset, callback);
    },
    function(callback) {
      // get public key that signed
      var id = asset.signature.creator;
      payswarm.identity.getIdentityPublicKey({id: id}, function(err, key) {
        if(err) {
          return callback(new PaySwarmError(
            'Invalid Asset; the public key used to verify the Asset could ' +
            'not be found.',
            MODULE_TYPE + '.InvalidAsset', {id: asset.id}, err));
        }
        callback(null, key);
      });
    },
    function(key, callback) {
      // ensure key is owned by authority or asset provider
      if(key.owner !== asset.assetProvider &&
        key.owner !== payswarm.config.authority.id) {
        return callback(new PaySwarmError(
          'Invalid Asset; the public key used to verify the Asset ' +
          'is not owned by the Asset provider or a PaySwarm Authority.',
          MODULE_TYPE + '.InvalidAsset', {id: asset.id}, err));
      }
      // verify signature
      payswarm.security.verifyJsonLd(asset, key, callback);
    },
    function(verified, callback) {
      if(!verified) {
        return callback(new PaySwarmError(
          'Invalid Asset; the Asset\'s digital signature is invalid.',
          MODULE_TYPE + '.InvalidAsset', {id: asset.id}));
      }
      callback();
    }
  ], callback);
}

/**
 * Validates a License.
 *
 * @param license the License to validate.
 * @param callback(err) called once the operation completes.
 */
function _validateLicense(license, callback) {
  payswarm.validation.validate('resources.license', license, callback);
}

/**
 * Validates a Listing.
 *
 * @param listing the Listing to validate.
 * @param callback(err) called once the operation completes.
 */
function _validateListing(listing, callback) {
  async.auto({
    validate: function(callback) {
      payswarm.validation.validate('resources.listing', listing, callback);
    },
    getAsset: ['validate', function(callback) {
      // get the related asset
      var query = {
        id: listing.asset,
        hash: listing.assetHash,
        type: 'ps:Asset',
        strict: true,
        fetch: true
      };
      api.asset.get(query, function(err, records) {
        if(err || records.length === 0) {
          err = new PaySwarmError(
            'Invalid Listing; its related Asset was not found.',
            MODULE_TYPE + '.InvalidListing', {
              id: listing.id,
              asset: listing.asset,
              assetHash: listing.assetHash,
              'public': true,
              httpStatusCode: 400
            }, err);
          return callback(err);
        }
        var asset = records[0].resource;
        callback(null, asset);
      });
    }],
    getListingKey: ['validate', function(callback, results) {
      var id = listing.signature.creator;
      payswarm.identity.getIdentityPublicKey({id: id}, function(err, key) {
        if(err) {
          return callback(new PaySwarmError(
            'Invalid Listing; the public key used to verify the Listing ' +
            'could not be found.',
            MODULE_TYPE + '.InvalidListing', {id: listing.id}, err));
        }
        callback(null, key);
      });
    }],
    verify: ['getAsset', 'getListingKey', function(callback, results) {
      // ensure listing public key is asset provider's or authority
      var key = results.getListingKey;
      if(key.owner !== results.getAsset.assetProvider &&
        key.owner !== payswarm.config.authority.id) {
        return callback(new PaySwarmError(
          'Invalid Listing; the public key used to verify the Listing ' +
          'is not owned by the Asset provider or a PaySwarm Authority.',
          MODULE_TYPE + '.InvalidListing', {id: listing.id}, err));
      }
      // verify signature
      payswarm.security.verifyJsonLd(listing, key, callback);
    }],
    verified: ['verify', function(callback, results) {
      if(!results.verify) {
        return callback(new PaySwarmError(
          'Invalid Listing; the Listing\'s digital signature is invalid.',
          MODULE_TYPE + '.InvalidListing', {id: listing.id}));
      }
      callback();
    }]
  }, callback);
}
