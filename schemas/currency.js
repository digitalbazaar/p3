var bedrock = require('bedrock');

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
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
