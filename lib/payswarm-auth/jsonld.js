/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var jsonld = require('jsonld')(); // use localized jsonld API

// require https for @contexts
var nodeDocumentLoader = jsonld.documentLoaders.node({secure: true});
jsonld.documentLoader = function(url, callback) {
  // FIXME: HACK: until https://w3id.org/payswarm/v1 is ready
  if(url === 'https://w3id.org/payswarm/v1') {
    var payswarm = {
      tools: require('./tools')
    };
    return callback(
      null, {
        contextUrl: null,
        document: {'@context': payswarm.tools.getDefaultJsonLdContext()},
        documentUrl: url
      });
  }
  nodeDocumentLoader(url, callback);
};

module.exports = jsonld;
