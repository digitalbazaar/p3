/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var util = require('util');
var payswarm = {
  logger: require('./payswarm.logger')
};

var api = {};
module.exports = api;

// PaySwarmError class
api.PaySwarmError = function(message, type, details) {
  Error.call(this, message);
  Error.captureStackTrace(this, this.constructor);
  this.name = type;
  this.message = message;
  this.details = details;
};
util.inherits(api.PaySwarmError, Error);
api.PaySwarmError.prototype.name = 'PaySwarmError';

/**
 * Gets the passed date in W3C format (eg: 2011-03-09T21:55:41Z).
 *
 * @param date the date.
 *
 * @return the date in W3C format.
 */
api.w3cDate = function(date) {
  if(date === undefined || date === null) {
    date = new Date();
  }
  return util.format('%d-%s-%sT%s:%s:%sZ',
    date.getUTCFullYear(),
    _zeroFill2(date.getUTCMonth() + 1),
    _zeroFill2(date.getUTCDate()),
    _zeroFill2(date.getUTCHours()),
    _zeroFill2(date.getUTCMinutes()),
    _zeroFill2(date.getUTCSeconds()));
};

function _zeroFill2(num) {
  return (num < 10) ? '0' + num : '' + num;
}

/**
 * Gets the default PaySwarm JSON-LD context.
 *
 * @return the default PaySwarm JSON-LD context.
 */
api.getDefaultJsonLdContext = function() {
  var ctx = {
    'ccard': 'http://purl.org/commerce/creditcard#',
    'com': 'http://purl.org/commerce#',
    'dc': 'http://purl.org/dc/terms/',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'gr': 'http://purl.org/goodrelations/v1#',
    'ps': 'http://purl.org/payswarm#',
    // 'psa': '...',
    'psp': 'http://purl.org/payswarm/preferences#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'sec': 'http://purl.org/security#',
    'vcard': 'http://www.w3.org/2006/vcard/ns#',
    'xsd': 'http://www.w3.org/2001/XMLSchema#',

    // type coercion
    'ccard:brand': {'@type': '@id'},
    'com:destination': {'@type': '@id'},
    'com:destinationOwnerType': {'@type': '@id'},
    'com:payee': {'@type': '@id'},
    'com:rateContext': {'@type': '@id'},
    'com:rateType': {'@type': '@id'},
    'com:source': {'@type': '@id'},
    'dc:creator': {'@type': '@id'},
    'ps:asset': {'@type': '@id'},
    'ps:assetAcquirer': {'@type': '@id'},
    'ps:assetProvider': {'@type': '@id'},
    'ps:authority': {'@type': '@id'},
    'ps:contentUrl': {'@type': '@id'},
    'ps:license': {'@type': '@id'},
    'ps:listing': {'@type': '@id'},
    // 'psa:module': {'@type': '@id'},
    // 'psa:role': {'@type': '@id'},
    'sec:publicKey': {'@type': '@id'},
    'sec:signer': {'@type': '@id'},
    // FIXME: be more strict with nonNegativeInteger?
    'com:payeePosition': {'@type': 'xsd:integer'},
    'dc:created': {'@type': 'xsd:dateTime'},
    'com:date': {'@type': 'xsd:dateTime'},
    'ps:validFrom': {'@type': 'xsd:dateTime'},
    'ps:validUntil': {'@type': 'xsd:dateTime'},
    'ps:licenseTemplate': {'@type': 'rdf:XMLLiteral'}
  };
  return ctx;
};

/**
 * Merges the contents of one or more objects into the first object.
 *
 * @param deep (optional), true to do a deep-merge.
 * @param target the target object to merge properties into.
 * @param objects N objects to merge into the target.
 *
 * @return the default PaySwarm JSON-LD context.
 */
api.extend = function() {
  var target;
  var deep = false;
  var i = 1;
  if(arguments.length > 0) {
    if(typeof arguments[0] === 'boolean') {
      deep = arguments[0];
      ++i;
    }
    else {
      target = arguments[0];
    }
  }
  target = target || {};
  for(; i < arguments.length; ++i) {
    var obj = arguments[i] || {};
    Object.keys(obj).forEach(function(name) {
      var value = obj[name];
      if(deep && typeof value === 'object' && !(value instanceof Array)) {
        target[name] = api.extend(true, target[name], value);
      }
      else {
        target[name] = value;
      }
    });
  }
  return target;
};

/**
 * Clones a value. If the value is an array or an object it will be deep cloned.
 *
 * @param value the value to clone.
 *
 * @return the clone.
 */
api.clone = function(value) {
  var rval;
  if(Array.isArray(value)) {
    rval = [];
    value.forEach(function(e) {
      rval.push(api.clone(e));
    });
  }
  else if(typeof value === 'object') {
    rval = {};
    Object.keys(value).forEach(function(name) {
      rval[name] = api.clone(value[name]);
    });
  }
  else {
    rval = value;
  }
  return rval;
};
