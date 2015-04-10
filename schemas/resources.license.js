var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;

var schema = {
  required: true,
  title: 'License',
  description: 'A License.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    type: schemas.jsonldType('License'),
    licenseTemplate: {
      required: true,
      type: 'string'
    }
  }
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
