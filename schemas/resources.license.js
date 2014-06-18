var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;
var tools = bedrock.tools;

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
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
