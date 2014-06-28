var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

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

module.exports.postPreferences = function() {
  return postPreferences;
};
