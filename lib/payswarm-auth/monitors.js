/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  events: bedrock.events,
  money: require('./money'),
  tools: require('./tools')
};
var util = require('util');
var Money = payswarm.money.Money;

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

  function _makeCubeTxnEvent(event, type) {
    var txn = event.details.transaction;
    var ev = {
      type: type,
      time: event.time,
      data: {
        id: event.details.transaction.id,
        type: null,
        currency: txn.currency,
        amount: +new Money(txn.amount),
        transfers: []
      }
    };
    if('authorized' in txn) {
      ev.data.authorized_ms =
        (new Date(event.details.transaction.authorized)) -
        (new Date(event.details.transaction.created));
    }
    if('settled' in txn) {
      ev.data.settled_ms =
        (new Date(event.details.transaction.settled)) -
        (new Date(event.details.transaction.created));
    }
    if('voided' in txn) {
      ev.data.voided_ms =
        (new Date(event.details.transaction.voided)) -
        (new Date(event.details.transaction.created));
    }
    txn.transfer.forEach(function(xfer) {
      ev.data.transfers.push({
        source: xfer.source,
        destination: xfer.destination,
        amount: +new Money(xfer.amount)
      });
    });

    if(jsonld.hasValue(txn, 'type', 'Contract')) {
      ev.data.type = 'contract';
    }
    if(jsonld.hasValue(txn, 'type', 'Deposit')) {
      ev.data.type = 'deposit';
    }
    if(jsonld.hasValue(txn, 'type', 'Withdrawal')) {
      ev.data.type = 'withdrawal';
    }
    else {
      ev.data.type = 'transfer';
    }

    return ev;
  }
  payswarm.events.on('common.Transaction.settled', function(event) {
    client.send(_makeCubeTxnEvent(event, 'settled'));
  });
  payswarm.events.on('common.Transaction.voided', function(event) {
    client.send(_makeCubeTxnEvent(event, 'voided'));
  });
}

