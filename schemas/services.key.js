var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var postKey = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    label: schemas.label({required: false}),
    revoked: {
      required: false,
      type: 'string'
    }
  },
  additionalProperties: false
};

var postKeys = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    label: schemas.label(),
    publicKeyPem: schemas.publicKeyPem()
  },
  additionalProperties: false
};

module.exports.postKey = function() {
  return postKey;
};
module.exports.postKeys = function() {
  return postKeys;
};
