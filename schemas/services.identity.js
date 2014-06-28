var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var sysImageType = {
  required: false,
  type: 'string',
  enum: ['url', 'gravatar']
};
var sysGravatarType = {
  required: false,
  type: 'string',
  enum: ['gravatar', 'mm', 'identicon', 'monsterid', 'wavatar', 'retro']
};
var sysPublic = {
  required: false,
  title: 'Identity Property Visibility',
  description: 'A list of Identity properties that are publicly visible.',
  type: 'array',
  uniqueItems: true,
  items: {
    type: 'string',
    enum: [
      'description',
      'email',
      'image',
      'label',
      'url'
    ]
  },
  errors: {
    invalid: 'Only "description", "email", "image", "label", and "url" are ' +
      'permitted.',
    missing: 'Please enter the properties that should be publicly visible.'
  }
};

var postIdentity = {
  title: 'Post Identity',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.identifier(),
    description: schemas.description({required: false}),
    //email: schemas.email({required: false}),
    image: schemas.url({required: false}),
    label: schemas.label({required: false}),
    url: schemas.url({required: false}),
    sysImageType: sysImageType,
    sysGravatarType: sysGravatarType,
    sysPublic: sysPublic,
    sysSigningKey: schemas.identifier({required: false})
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
  description: 'Identity credentials query or Identity creation',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: {
      required: true,
      type: 'string',
      enum: ['PersonalIdentity', 'VendorIdentity']
    },
    sysSlug: schemas.slug(),
    label: schemas.label(),
    image: schemas.url({required: false}),
    email: schemas.email(),
    sysPassword: schemas.password(),
    url: schemas.url({required: false}),
    description: schemas.description({required: false}),
    sysImageType: sysImageType,
    sysGravatarType: sysGravatarType,
    sysPublic: sysPublic
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
