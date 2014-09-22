/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var br = require('bedrock');

if(module.parent) {
  module.exports = br;
} else {
  // load PaySwarm config and dev data
  require('./configs/payswarm.dev');
  require('./configs/dev-data');
  br.start();
}
