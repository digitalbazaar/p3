/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var payswarm = {
  config: require('../config'),
  events: require('./events'),
  tools: require('./tools')
};
var util = require('util');

// constants
var MODULE_TYPE = 'payswarm.monitors';
var MODULE_IRI = 'https://payswarm.com/modules/monitors';

// module API
var api = {};
api.name = MODULE_TYPE + '.Monitors';
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  var cfg = payswarm.config;
  if('cube' in cfg.monitors && cfg.monitors.cube.enabled) {
    _initCubeMonitor();
  }
  callback();
};

function _initCubeMonitor() {
  var cube = require('cube');
  var options = payswarm.tools.extend({}, payswarm.config.monitors.cube, {
    protocol: 'udp',
    host: 'localhost',
    port: 1180,
    debug: false
  });
  var url = util.format('%s://%s:%s',
    options.protocol, options.host, options.port);
  var client = cube.emitter(url);

  payswarm.events.on('common.Transaction.settled', function(event) {
    client.send({
      type: 'settled',
      time: event.time,
      data: {
        id: event.details.transaction.id,
        duration_ms: event.time - (new Date(event.details.transaction.created))
      }
    });
  });
  payswarm.events.on('common.Transaction.voided', function(event) {
    client.send({
      type: 'voided',
      time: event.time,
      data: {
        id: event.details.transaction.id,
        duration_ms: event.time - (new Date(event.details.transaction.created))
      }
    });
  });
}

