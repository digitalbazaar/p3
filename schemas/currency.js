var bedrock = require('bedrock');
var tools = bedrock.tools;

var schema = {
  required: true,
  title: 'Currency',
  description: 'A currency code or identifier.',
  type: 'string',
  enum: ['USD'],
  errors: {
    invalid: 'Please enter a valid currency.',
    missing: 'Please enter a currency.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
