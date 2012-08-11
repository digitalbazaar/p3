/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var events = require('events');
var payswarm = {
  logger: require('./payswarm.loggers').get('app')
};

var api = new events.EventEmitter();
api.setMaxListeners(0);
var emit = api.emit;
api.emit = function() {
  var args = arguments;
  // emit asynchronously
  process.nextTick(function() {
    emit.apply(api, args);
  });
};
module.exports = api;
