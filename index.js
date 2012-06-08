/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var pa = require('./lib/payswarm-auth');

if(module.parent) {
  module.exports = pa;
}
else {
  pa.start();
}
