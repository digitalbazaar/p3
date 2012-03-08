/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var events = require('events');
var payswarm = {
  logger: require('./payswarm.logger')
};

var api = new EventEmitter();
module.exports = api;
