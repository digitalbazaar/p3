/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var payswarm = {
  logger: require('./payswarm.logger')
};

var api = {};
module.exports = api;

api.name = 'Asset';
api.init = function(app, callback) {
  callback(null);
};
