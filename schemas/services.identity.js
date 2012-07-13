var label = require('./label');
var slug = require('./slug');
var publicKeyPem = require('./publicKeyPem');

var postIdentity = {
  type: 'object',
  properties: {
    label: label()
  },
  additionalProperties: false
};

var postIdentities = {
  type: 'object',
  properties: {
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
  type: 'object',
  properties: {
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
