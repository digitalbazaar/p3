var label = require('./label');
var slug = require('./slug');
var publicKeyPem = require('./publicKeyPem');

var postIdentity = {
  type: 'object',
  properties: {
    'rdfs:label': label()
  }
};

var postIdentities = {
  type: 'object',
  properties: {
    '@type': {
      required: true,
      type: 'string',
      enum: ['ps:PersonalIdentity', 'ps:VendorIdentity']
    },
    'psa:slug': slug(),
    'rdfs:label': label(),
    'foaf:homepage': {
      required: false,
      type: 'string'
    },
    'dc:description': {
      required: false,
      type: 'string'
    }
  }
};

var postPreferences = {
  type: 'object',
  properties: {
    'com:destination': {
      required: true,
      type: 'string'
    },
    'sec:publicKey': {
      required: true,
      type: [{
        // IRI only
        type: 'string'
      }, {
        // label+pem
        type: 'object',
        properties: {
          'rdfs:label': label(),
          'sec:publicKeyPem': publicKeyPem()
        }
      }]
    }
  }
};

module.exports.postIdentity = function() {
  return postIdentity;
};
module.exports.postIdentities = function() {
  return postIdentities;
};
module.exports.postPreferences = function() {
  return postPreferences;
};
