var tools = require('../lib/payswarm-auth/tools');

var schema = {
  required: true,
  title: 'Currency',
  description: 'A currency code or identifier.',
  type: 'string',
  enum: ['usd'],
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
