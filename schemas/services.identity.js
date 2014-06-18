var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var postIdentity = {
  title: 'Post Identity',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    label: schemas.label()
  },
  additionalProperties: false
};

var getIdentitiesQuery = {
  title: 'Get Identities Query',
  type: 'object',
  properties: {
    form: {
      required: false,
      type: 'string',
      enum: ['register']
    },
    'public-key-label': {
      required: false,
      type: schemas.label()
    },
    'public-key': {
      required: false,
      type: schemas.publicKeyPem()
    },
    'registration-callback': {
      required: false,
      type: schemas.url()
    },
    'response-nonce': {
      required: false,
      type: schemas.nonce()
    }
  },
  additionalProperties: true
};

var postIdentities = {
  title: 'Post Identities',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: {
      required: true,
      type: 'string',
      enum: ['PersonalIdentity', 'VendorIdentity']
    },
    psaSlug: schemas.slug(),
    label: schemas.label(),
    website: {
      required: false,
      type: 'string'
    },
    description: {
      required: false,
      type: 'string'
    },
    psaPublic: {
      required: false,
      type: schemas.propertyVisibility()
    }
  },
  additionalProperties: false
};

var postPreferences = {
  title: 'Post Preferences',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: schemas.jsonldType('IdentityPreferences'),
    destination: schemas.url({required: false}),
    source: schemas.url({required: false}),
    publicKey: {
      required: false,
      type: [{
        // IRI only
        type: 'string'
      }, {
        // label+pem
        type: 'object',
        properties: {
          label: schemas.label(),
          publicKeyPem: schemas.publicKeyPem()
        }
      }]
    }
  },
  additionalProperties: false
};

module.exports.postIdentity = function() {
  return postIdentity;
};
module.exports.getIdentitiesQuery = function() {
  return getIdentitiesQuery;
};
module.exports.postIdentities = function() {
  return postIdentities;
};
module.exports.postPreferences = function() {
  return postPreferences;
};
