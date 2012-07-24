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
var ERROR_TYPE = 'payswarm.docs';
var api = {};
module.exports = api;

// Contains all of the documentation entries for the system
var docs = {};

// The annotation module
var annotate = {};

// The acceptable documentation categories
api.categories = [
  'Service Endpoints', 'Identities', 'Accounts', 'Budgets', 'Keys'];

/**
 * Retrieve all of the annotations for the system.
 *
 * @returns a map of maps where the first map is keyed by HTTP verbs and the
 *   second-level map is keyed by HTTP URL paths from the root of the server.
 *   Each entry contains an annotations object.
 */
api.getAnnotations = function() {
  return docs;
};

/**
 * Documents a particular method and path of the system.
 *
 * @param method the HTTP method name.
 * @param path the HTTP path from the root of the server. The path may include
 *   named variables like /i/:identity.
 * @param annotations the annotations associated with the documentation entry.
 *          [public] true if the documentation should be public.
 *          [group] the name of the documentation group for the entry.
 *            Acceptable values include 'Identities', 'Accounts', 'Budgets',
 *            'Keys', and 'Service Endpoints'.
 *          [rateLimit] number of requests per hour for unmetered accounts.
 *          [authentication] the types of authentication that may be used to
 *            perform the action.
 *          [validation] the name of the JSON-Schema validator, for example:
 *            'services.budget.postBudgets'.
 *          [exampleResponse] an object of an example response, which is
 *            transformed to pretty-printed JSON output.
 *          [description] brief description of the web service.
 */
api.document = function(method, path, annotations) {
  if(!(method in docs)) {
    docs[method] = {};
  }
  annotations.method = method;
  annotations.path = path;
  docs[method][path] = annotations;
};

// short-hand aliases for the documentation methods
annotate.get = function(path, options) {
  api.document('GET', path, options);
};

annotate.post = function(path, options) {
  api.document('POST', path, options);
};

annotate['delete'] = function(path, options) {
  api.document('DELETE', path, options);
};

api.annotate = annotate;
