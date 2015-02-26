var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;
var tools = bedrock.tools;

var schema = {
  required: true,
  title: 'Vendor',
  description: 'A vendor for a Listing or a permitted vendor for a particular Asset.',
  type: [
    schemas.url(),
    {
      type: 'array',
      uniqueItems: true,
      items: schemas.url(),
      errors: {
        invalid: 'The vendor is invalid.',
        missing: 'The vendor is missing.'
      }
    }
  ]
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
