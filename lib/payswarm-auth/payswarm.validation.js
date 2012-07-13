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

// load resource schemas
var resources = ['asset', 'license', 'listing'];
for(var i in resources) {
  var resource = resources[i];
  var module = require('../../schemas/resources.' + resource);
  schemas['resources.' + resource] = module();
}

/**
 * This method takes one or three parameters.
 *
 * If only one parameter is given, returns express middleware that will be
 * used to validate a request body using the schema associated with the
 * given name.
 *
 * If three parameters are given, the second parameter must be the data to
 * validate and the third must be function to be called once the validation
 * operation completes.
 *
 * @param name the name of the schema to use.
 * @param [data] the data to validate.
 * @param [callback(err)] called once the operation completes.
 */
api.validate = function(name, data, callback) {
  // look up schema by name
  var schema = null;
  if(name in api.schemas) {
    schema = api.schemas[name];
  }

  // do immediate validation if callback is present
  if(callback) {
    if(!schema) {
      return callback(new PaySwarmError(
        'Could not validate data; unknown schema name.',
        ERROR_TYPE + '.UnknownSchema', {schema: name}));
    }
    return _validate(data, schema, callback);
  }

  // schema does not exist, return middle that raises error
  if(!schema) {
    return function(req, res, next) {
      next(new PaySwarmError(
        'Could not validate request; unknown schema name.',
        ERROR_TYPE + '.UnknownSchema', {schema: name}));
    };
  }

  // return validation middleware
  return function(req, res, next) {
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
    details.schema = {
      title: error.schema.title || '',
      description: error.schema.description || ''
    };
    // include custom errors or use default
    details.errors = error.schema.errors || {
      invalid: 'Invalid input.',
      missing: 'Missing input.'
    };
    if(error.value) {
      // include value if not masked
      if(!error.mask) {
        details.value = error.value;
      }
      else {
        details.value = '***MASKED***';
      }
    }

    // add payswarm validation error
    errors.push(new PaySwarmError(
      error.message, ERROR_TYPE + '.ValidationError', details));
  }

  callback(new PaySwarmError(
    'A validation error occured in the \''+ schema.title +'\' validator.',
    ERROR_TYPE + '.ValidationError', {'public': true, errors: errors}));
}
