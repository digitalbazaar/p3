/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var path = require('path');
__libdir = process.env.PAYSWARM_AUTH_COV ?
  path.resolve(__dirname, 'lib-cov') :
  path.resolve(__dirname, 'lib');
var pa = require(__libdir + '/payswarm-auth');
var program = require('commander');

program
  .version('0.0.1')
  .usage('[options]')
  .option('-u, --unit', 'Perform all unit tests')
  .option('-i, --integration', 'Perform all integration tests')
  .option('-d, --display', 'The X display to use for integration tests')
  .parse(process.argv);

// browser-based integration tests should connect to an X display
if(!process.env.DISPLAY) {
  process.env.DISPLAY = program.display ? program.display : ':0';
}

// check to see which test suites to run
var tests = [];
if(program.unit) {
  tests.push('unit');
}
if(program.integration) {
  tests.push('integration');
}

if(tests.length < 1) {
  console.log('Error: You must specify the type of test to run.');
  program.help();
  process.exit(1);
}

// notify superagent that it should ignore self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_ENV = 'test';
process.env.TEST_ENV = tests.join(',');

// load test config and start
require('./configs/test');
pa.start();
