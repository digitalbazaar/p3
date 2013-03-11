/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
// FIXME: Should this be a global variable?
__libdir = require('path').resolve(__dirname, 'lib');
var pa = require(__libdir + '/payswarm-auth');

if(module.parent) {
  module.exports = pa;
}
else {
  // running in development mode
  // load dev config and start
  require('./configs/dev');
  pa.start();
}
