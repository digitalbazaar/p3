/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  events: require('./events'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools'),
  PasswordStrategy: require('./PasswordStrategy'),
  SignedGraphStrategy: require('./SignedGraphStrategy')
};
var vows = require('vows');
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.test';
var MODULE_IRI = 'https://payswarm.com/modules/test';

// module API
var api = {};
api.name = MODULE_TYPE + '.Test';
api.type = MODULE_TYPE;
api.iri = MODULE_IRI;
module.exports = api;

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      runTests(callback);
    }
  ], callback);
};

/**
 * Runs all automated tests.
 *
 * @param callback(err) called once the tests complete.
 */
function runTests(callback) {
  console.log('Running test suite...');

  vows.describe('payswarm-auth tests').addBatch(
    require('./test.money')
  ).addBatch(
    require('./test.payee')
  ).addBatch(
    require('./test.tools')
  ).run({error: false}, function(results) {
    //console.log('Results', results);
    console.log('Tests complete.');
    process.exit();
  });
}
