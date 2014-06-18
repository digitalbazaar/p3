var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var cacheLicense = {
  title: 'Cache License',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    license: schemas.url(),
    licenseHash: {
      required: false,
      type: 'string'
    },
    signature: schemas.graphSignature({required: false})
  },
  additionalProperties: false
};

module.exports.cacheLicense = function() {
  return cacheLicense;
};
