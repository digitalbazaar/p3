/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var jsonld = require('jsonld')(); // use localized jsonld API

// require https for @contexts
var nodeContextLoader = jsonld.contextLoaders.node({secure: true});
jsonld.loadContext = function(url, callback) {
  // FIXME: HACK: until https://w3id.org/payswarm/v1 is ready
  if(url === 'https://w3id.org/payswarm/v1') {
    console.log('USING LOCAL');
    return callback(
      null, url, {'@context': payswarm.tools.getDefaultJsonLdContext()});
  }
  console.log('using external');
  nodeContextLoader(url, callback);
};

module.exports = jsonld;
