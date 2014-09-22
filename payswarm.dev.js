/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var path = require('path');
GLOBAL.__libdir = path.resolve(path.join(
  __dirname, 'node_modules', 'bedrock', 'lib'));
var br = require(path.join(GLOBAL.__libdir, 'bedrock'));

if(module.parent) {
  module.exports = br;
} else {
  // load PaySwarm config
  require('./configs/payswarm.dev');
  br.start();
}
