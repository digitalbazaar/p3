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
  var result = jsonschema(instance, schema);
  if(result.valid) {
    return callback();
  }

  // get error messages
  var errors = [];
  for(var i in result.errors) {
    var error = result.errors[i];

    // create new error details
    var details = {'public': true};

    try {
      // get error details via error property path
      var path = error.property.split('.');
      _getErrorDetails(details, schema, path, '');
    }
    catch(ex) {
      return callback(ex);
    }

    errors.push(new PaySwarmError(
      error.message, ERROR_TYPE + '.ValidationError', details));
  }

  callback(new PaySwarmError(
    'A validation error occurred.',
    ERROR_TYPE + '.ValidationError', {'public': true, errors: errors}));
}

/**
 * Gets the error details for the given schema and path.
 *
 * @param details the error details to populate.
 * @param schema the schema.
 * @param path the path to the sub schema that the error occurred in.
 * @param schemaPath the reconstructed/corrected schema path.
 */
function _getErrorDetails(details, schema, path, schemaPath) {
  // iterate through schema type(s)
  var types = Array.isArray(schema.type) ? schema.type : [schema.type];
  for(var i in types) {
    var type = types[i];
    if(type instanceof Object) {
      _getErrorDetails(details, type, path, schemaPath);
      continue;
    }

    // reached end of path, set details
    if(path.length === 0) {
      details.schema = schema;
      details.path = schemaPath;
      continue;
    }

    // get container for property/index
    var container;
    if(type === 'object') {
      container = schema.properties;
    }
    else if(type === 'array') {
      container = Array.isArray(schema.items) ? schema.items : [schema.items];
    }
    else {
      // property can't match, no container
      continue;
    }

    // get next property from path
    path = payswarm.tools.clone(path);
    var property = path.shift();
    if(schemaPath) {
      schemaPath += '.' + property;
    }
    else {
      schemaPath = property;
    }

    // build property in the event it has a '.' in its actual name
    while(path.length > 0 && !(property in container)) {
      schemaPath += '\\.' + path[0];
      property += '.' + path.shift();
    }

    // error is for another type branch in the schema
    if(!(property in container)) {
      continue;
    }

    _getErrorDetails(details, container[property], path, schemaPath);
  }
}
