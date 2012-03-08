/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var email = require('emailjs');
var payswarm = {
  logger: require('./payswarm.logger')
};

var api = {};
module.exports = api;

api.name = 'Mail';
api.init = function(app, callback) {
  callback(null);
};
