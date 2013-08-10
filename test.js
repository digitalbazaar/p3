/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var path = require('path');
__libdir = process.env.PAYSWARM_AUTH_COV ?
  path.resolve(__dirname, 'lib-cov') :
  path.resolve(__dirname, 'lib');
var pa = require(__libdir + '/payswarm-auth');

// load test config and start
require('./configs/test');
pa.start();
