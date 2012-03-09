/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var payswarm = {
  logger: require('./payswarm.logger')
};

// payment gateway module API
var api = {};
api.name = 'Test';
module.exports = api;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  callback(null);
};

// FIXME: implement me
api.createPaymentToken = function(source, token, callback) {
};
