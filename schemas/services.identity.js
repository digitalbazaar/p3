var label = require('./label');
var slug = require('./slug');
var publicKeyPem = require('./publicKeyPem');
var jsonldContext = require('./jsonldContext');
var graphSignature = require('./graphSignature');

var postIdentity = {
  title: 'Post Identity',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    label: label()
  },
  additionalProperties: false
};

var postIdentities = {
  title: 'Post Identities',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    type: {
      required: true,
      type: 'string',
      enum: ['ps:PersonalIdentity', 'ps:VendorIdentity']
    },
    psaSlug: slug(),
    label: label(),
    homepage: {
      required: false,
      type: 'string'
    },
    description: {
      required: false,
      type: 'string'
    }
  },
  additionalProperties: false
};

var postPreferences = {
  title: 'Post Preferences',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    destination: {
      required: true,
      type: 'string'
    },
    publicKey: {
      required: true,
      type: [{
        // IRI only
        type: 'string'
      }, {
        // label+pem
        type: 'object',
        properties: {
          label: label(),
          publicKeyPem: publicKeyPem()
        }
      }]
    }
  },
  additionalProperties: false
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
