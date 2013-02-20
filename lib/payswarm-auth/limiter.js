/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var redback = require('redback');
var payswarm = {
  config: require('../config'),
  logger: require('./loggers').get('app'),
  tools: require('./tools')
};

// FIXME: remove in node > 0.6.x
var http = require('http');
if(!(429 in http.STATUS_CODES)) {
  http.STATUS_CODES[429] = 'Too Many Requests';
}

var api = {};
module.exports = api;
api.name = 'limiter';

// the Redis-backed limiters
var limits = {};

// redis client
var rbclient;

api.init = function(app, callback) {
  // NOTE: app is not setup yet, use with care.

  // get Redis-client
  var rbclient = redback.createClient(
    payswarm.config.limiter.port,
    payswarm.config.limiter.host,
    payswarm.config.limiter.options);

  // use password if configured
  if(payswarm.config.limiter.password) {
    rbclient.client.auth(payswarm.config.limiter.password, function() {});
  }

  // log redis errors
  rbclient.client.on('error', function(err) {
    payswarm.logger.error('Redis error:', err.toString());
  });

  rbclient.client.on('connect', function(err) {
    payswarm.logger.info('Redis connected.');
  });

  // wait until ready and setup limiters
  rbclient.client.on('ready', function() {
    payswarm.logger.info('Redis ready.');
    payswarm.logger.info('Adding IP limiters.');

    // create limits:
    // 60 second sample chunk per bucket, each bucket times out after an hour
    var ipLimit = rbclient.createRateLimit('requests-by-ip', {
      // FIXME: add configure options
      bucket_interval: 60,
      bucket_span: 3600,
      subject_expiry: 3600
    });
    limits['*'] = ipLimit;
  });

  // clean up when connetion closed
  rbclient.client.on('end', function() {
    payswarm.logger.info('Redis disconnected.');
    payswarm.logger.info('Removing IP limiters.');
    limits = {};
  });
};

/**
 * Limits HTTP requests based on the requesting IP address.
 *
 * @param req the HTTP request.
 * @param res the HTTP response.
 * @param next the next function in the chain.
 */
api.ipRateLimit = function(req, res, next) {
  // check for no limit
  if(payswarm.config.limiter.ipRequestsPerHour <= 0) {
    return next();
  }

  // FIXME: limit based on route and route cost
  // FIXME: calculate route cost dynamically
  var ipLimit = limits['*'];

  if(!ipLimit) {
    payswarm.logger.warn('No IP limiter configured.');
    return next();
  }

  // FIXME: add configure options
  var pause = payswarm.tools.pause(req);
  ipLimit.addCount(req.ip, 3600, function(err, count) {
    pause.resume();

    if(err) {
      // log error
      payswarm.logger.error('A Redis error occurred:', err.toString());

      // permit request
      return next();
    }

    // not rate limited
    if(count <= payswarm.config.limiter.ipRequestsPerHour) {
      return next();
    }

    // rate limited
    // FIXME: set the Retry-After HTTP Header
    //res.set('Retry-After', '...');
    res.send(
      429, 'Request denied. Too many HTTP requests from your IP address.');
  });
};
