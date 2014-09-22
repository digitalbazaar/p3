/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var br = require('bedrock');

if(module.parent) {
  module.exports = br;
} else {
  // load PaySwarm config
  require('./configs/payswarm.dev');
  br.start();
}
