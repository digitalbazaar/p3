/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var payswarm = {
  logger: require('./loggers').get('app')
};

var api = {};
module.exports = api;

api.name = 'System';
api.init = function(app, callback) {
  callback(null);
};
