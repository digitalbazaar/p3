/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var fs = require('fs');
var path = require('path');
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
var Mocha = require('mocha');

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
  setTimeout(runTests, 100);
  callback();
};

/**
 * Runs all automated tests.
 *
 * @param callback(err) called once the tests complete.
 */
function runTests(callback) {
  var reporter =  process.env['PAYSWARM_AUTH_COV'] ? 'html-cov' : 'spec';

  // create a new Mocha test runner
  var mocha = new Mocha({
    reporter: reporter,
    timeout: 5000,
    // FIXME: we shouldn't be ignoring leaks
    ignoreLeaks: true
  });

  // FIXME: Change this once all test files are in mocha format
  mocha.addFile(path.resolve(__dirname, 'tests/tools.js'));
  mocha.addFile(path.resolve(__dirname, 'tests/money.js'));
  mocha.addFile(path.resolve(__dirname, 'tests/schemas.js'));
  mocha.addFile(path.resolve(__dirname, 'tests/security.js'));
  mocha.addFile(path.resolve(__dirname, 'tests/payee.js'));
  /*
  fs.readdirSync('test/').filter(function(file){
    // Only keep the .test.js files
    return file.substr(-8) === '.test.js';

  }).forEach(function(file){
    // Use the method "addFile" to add the file to mocha
    mocha.addFile(
        path.join('test/', file)
    );
  });
  */

  mocha.run(function(failures){
   process.exit(failures);
  });
};
