/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var jsonschema = require('json-schema');
var payswarm = {
  config: require('../payswarm.config'),
  logger: require('./payswarm.loggers').get('app'),
  tools: require('./payswarm.tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

var ERROR_TYPE = 'payswarm.validation';

var api = {};
module.exports = api;

// available schemas
var schemas = api.schemas = {};

// load service schemas
var services = [
  'account',
  'address',
  'budget',
  'identifier',
  'identity',
  'key',
  'license',
  'paymentToken',
  'profile',
  'transaction'];
for(var i in services) {
  var service = services[i];
  var module = require('../../schemas/services.' + service);
  for(var key in module) {
    schemas['services.' + service + '.' + key] = module[key]();
  }
}

/**
 * Returns express middleware that will be used to validate a request
 * body using the schema associated with the given name.
 *
 * @param name the name of the schema to use.
 */
api.validate = function(name) {
  return function(req, res, next) {
    if(!(name in api.schemas)) {
      return next(new PaySwarmError(
        'Could not validate request; unknown schema name.',
        ERROR_TYPE + '.UnknownSchema', {schema: name}));
    }
    var schema = api.schemas[name];
    _validate(req.body, schema, next);
  };
};

/**
 * Validates an instance against a schema.
 *
 * @param instance the instance to validate.
 * @param schema the schema to use.
 * @param callback(err) called once the operation completes.
 */
function _validate(instance, schema, callback) {
  // do validation
  var result = jsonschema(instance, schema);
  if(result.valid) {
    return callback();
  }

  // create public error messages
  var errors = [];
  for(var i in result.errors) {
    var error = result.errors[i];

    // create custom error details
    var details = {
      path: error.property,
      'public': true
    };
    // include custom errors or use default
    details.errors = error.schema.errors || {
      invalid: 'Invalid input.',
      missing: 'Missing input.'
    };
    // include value if not masked
    if(!error.mask && error.value) {
      details.value = error.value;
    }

    // add payswarm validation error
    errors.push(new PaySwarmError(
      error.message, ERROR_TYPE + '.ValidationError', details));
  }

  callback(new PaySwarmError(
    'A validation error occurred.',
    ERROR_TYPE + '.ValidationError', {'public': true, errors: errors}));
}
