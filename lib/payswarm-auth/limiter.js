/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var redback = require('redback');
var payswarm = {
  config: require('../config'),
  logger: require('./loggers').get('app'),
  tools: require('./tools')
};

var api = {};
module.exports = api;

// the Redis-backed limiters
var limits = {};

// get Redis-client
var rbclient = redback.createClient();

// create limits:

// 60 second sample chunk per bucket, each bucket times out after an hour
var ipLimit = rbclient.createRateLimit('requests-by-ip', {
  // FIXME: add configure options
  bucket_interval: 60,
  bucket_span: 3600,
  subject_expiry: 3600
});
limits['*'] = ipLimit;

/**
 * Limits HTTP requests based on the requesting IP address.
 *
 * @param req the HTTP request.
 * @param res the HTTP response.
 * @param next the next function in the chain.
 */
api.ipRateLimit = function(req, res, next) {
  // limits off
  if(payswarm.config.limiter.ipRequestsPerHour <= 0) {
    return next();
  }

  // FIXME: limit based on route and route cost
  // FIXME: calculate route cost dynamically
  var ipLimit = limits['*'];

  // FIXME: add configure options
  var pause = payswarm.tools.pause(req);
  ipLimit.addCount(req.ip, 3600, function(err, count) {
    pause.resume();

    if(err) {
      // log error
      payswarm.logger.error('Redis error', {error: err});

      // permit request
      return next();
    }

    // not rate limited
    if(count <= payswarm.config.limiter.ipRequestsPerHour) {
      return next();
    }

    // rate limited
    // FIXME: set the Retry-After HTTP Header
    //res.set('Retry-After', '');
    res.send(
      503, 'Request denied. Too many HTTP requests from your IP address.');
  });
};
