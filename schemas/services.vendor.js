var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;

var getRegisterQuery = {
  title: 'Get Vendor Register Query',
  type: 'object',
  properties: {
    'public-key': schemas.publicKeyPem({required: false}),
    'public-key-label': schemas.label({required: false}),
    'registration-callback': schemas.url({required: false}),
    'response-nonce': schemas.nonce({required: false})
  },
  additionalProperties: true
};

module.exports.getRegisterQuery = function() {
  return getRegisterQuery;
};
