/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var path = require('path');
GLOBAL.__libdir = path.resolve(path.join(
  __dirname, 'node_modules', 'bedrock', 'lib'));
var br = require(path.join(__libdir, 'bedrock'));
// load PaySwarm config
require('./configs/payswarm.dev');

if(module.parent) {
  module.exports = br;
}
else {
  br.start();
}
