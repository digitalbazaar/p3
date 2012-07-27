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
 * @param docFile the name of the associated document file in the
 *   views/docs/ directory.
 */
api.document = function(method, path, docFile) {
  if(!(method in docs)) {
    docs[method] = {};
  }
  docs[method][path] = docFile;
};

// short-hand aliases for the documentation methods
annotate.get = function(path, docFile) {
  api.document('GET', path, docFile);
};

annotate.post = function(path, docFile) {
  api.document('POST', path, docFile);
};

annotate['delete'] = function(path, docFile) {
  api.document('DELETE', path, docFile);
};

api.annotate = annotate;
