/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var payswarm = {
  logger: require('./loggers').get('app')
};

var api = {};
module.exports = api;

api.name = 'System';
api.init = function(app, callback) {
  callback(null);
};
