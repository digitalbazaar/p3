var bedrock = require('bedrock');
var tools = bedrock.tools;

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
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
