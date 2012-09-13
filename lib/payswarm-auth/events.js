/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var events = require('events');
var payswarm = {
  logger: require('./loggers').get('app')
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
/**
 * Emit an event object.
 *
 * @param event An event object with the following fields:
 *          type: event type (string)
 *          time: event time (Date, optional)
 *          details: event details (object)
 */
api.emitEvent = function(event) {
  // add time if not present
  event.time = event.time || new Date;
  api.emit(event.type, event);
};
module.exports = api;
