var email = require('./email');
var slug = require('./slug');
var password = require('./password');
var publicKeyPem = require('./publicKeyPem');
var label = require('./label');
var jsonldContext = require('./jsonldContext');

var postProfileCreate = {
  title: 'Create test profile',
  description: 'Create a test profile.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    psaSlug: slug({required: false}),
    email: email(),
    psaPassword: password(),
    label: label({required: false}),
    psaPublicKey: {
      required: false,
      type: 'object',
      properties: {
        label: label(),
        publicKeyPem: publicKeyPem()
      }
    },
    psaIdentity: {
      required: true,
      type: 'object',
      properties: {
        type: {
          required: true,
          type: 'string',
          enum: ['ps:PersonalIdentity', 'ps:VendorIdentity']
        },
        psaSlug: slug(),
        label: label()
      }
    },
    account: {
      required: true,
      type: 'object',
      properties: {
        psaSlug: slug(),
        label: label()
      }
    }
  },
  additionalProperties: false
};

module.exports.postProfileCreate = function() {
  return postProfileCreate;
};
