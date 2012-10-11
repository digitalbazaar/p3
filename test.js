/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var pa = require('./lib/payswarm-auth');

// load test config and start
require('./configs/test');
pa.start();
