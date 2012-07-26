/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var redback = require('redback');
var payswarm = {
  config: require('../payswarm.config'),
  logger: require('./payswarm.loggers').get('app'),
};

// constants
var MODULE_TYPE = 'payswarm.limiter';
var MODULE_IRI = 'https://payswarm.com/modules/limiter';

var api = {};
api.name = MODULE_TYPE + '.Limiter';
module.exports = api;

// the Redis-backed limiters
var limits = {};

/**
 * Initializes the module by setting up basic limits.
 */
api.init = function(app, callback) {
  var rbclient = redback.createClient();

  // 60 second sample chunk per bucket, each bucket times out after an hour
  var ipLimit = rbclient.createRateLimit('requests-by-ip', {
    // FIXME: add configure options
    bucket_interval: 60,
    bucket_span: 3600,
    subject_expiry: 3600
  });
  limits['*'] = ipLimit;
  callback();
};

/**
 * Limits HTTP requests based on the requesting IP address.
 *
 * @param req the HTTP request.
 * @param res the HTTP response.
 * @param next the next function in the chain.
 */
api.ipRateLimit = function(req, res, next) {
  // FIXME: limit based on route and route cost
  // FIXME: calculate route cost dynamically
  var ipLimit = limits['*'];
  var ip = req.ip;

  // FIXME: add configure options
  ipLimit.add(ip);
  ipLimit.count(ip, 3600, function (err, count) {
    if(payswarm.config.limiter.ipRequestsPerHour === 0 ||
      count <= payswarm.config.limiter.ipRequestsPerHour) {
      next();
    }

    // rate limited
    // FIXME: set the Retry-After HTTP Header
    //res.set('Retry-After', '');
    res.send(
      503, 'Request denied. Too many HTTP requests from your IP address.');
  });
};
