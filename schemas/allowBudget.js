var bedrock = require('bedrock');

var schema = {
  required: false,
  title: 'Allow Budget',
  description: 'A flag to indicate whether a budget can be used in a purchase.',
  type: 'boolean',
  errors: {
    invalid: 'Please enter a valid preference (true/false) for allowing a budget.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
