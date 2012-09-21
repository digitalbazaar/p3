/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var events = require('events');
var payswarm = {
  logger: require('./loggers').get('app')
};

var api = new events.EventEmitter();
api.setMaxListeners(0);
// store original emit function
var emit = api.emit;

/**
 * Emit an event either by type name or with an event object. This function
 * overloads the standard EventEmitter emit() call.
 *
 * Two forms are available:
 * * The standard emit() usage of an event type and an arbitrary number of
 *   arguments.
 * * An single event object argument with the following fields:
 *     type: event type (string)
 *     time: event time (Date, optional, added if omitted)
 *     details: event details (object)
 */
api.emit = function(event /* ... */) {
  var args;
  // check for event object
  if(typeof event === 'object') {
    // add time if not present
    event.time = event.time || new Date();
    args = [event.type, event];
  }
  // otherwise assume regular emit call
  else {
    args = arguments;
  }
  // emit asynchronously
  process.nextTick(function() {
    emit.apply(api, args);
  });
};

module.exports = api;
