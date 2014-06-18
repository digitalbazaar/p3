var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var postProfileCreate = {
  title: 'Create test profile',
  description: 'Create a test profile.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    psaSlug: schemas.slug({required: false}),
    email: schemas.email(),
    psaPassword: schemas.password(),
    label: schemas.label({required: false}),
    psaPublicKey: {
      required: false,
      type: 'object',
      properties: {
        label: schemas.label(),
        publicKeyPem: schemas.publicKeyPem()
      }
    },
    psaIdentity: {
      required: true,
      type: 'object',
      properties: {
        type: {
          required: true,
          type: 'string',
          enum: ['PersonalIdentity', 'VendorIdentity']
        },
        psaSlug: schemas.slug(),
        label: schemas.label()
      }
    },
    account: {
      required: true,
      type: 'object',
      properties: {
        psaSlug: schemas.slug(),
        label: schemas.label()
      }
    }
  },
  additionalProperties: false
};

var postIdsCreateQuery = {
  title: 'Create test ids',
  description: 'Create test ids.',
  type: 'object',
  properties: {
    generator: {
      required: false,
      type: 'string'
    },
    count: {
      required: false,
      type: 'string'
    },
    wait: {
      required: false,
      type: 'string'
    },
    concurrency: {
      required: false,
      type: 'string'
    }
  },
  additionalProperties: false
};

module.exports.postProfileCreate = function() {
  return postProfileCreate;
};
module.exports.postIdsCreateQuery = function() {
  return postIdsCreateQuery;
};
