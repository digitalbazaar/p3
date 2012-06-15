var tools = require('../lib/payswarm-auth/payswarm.tools');

var schema = {
  required: true,
  title: 'Privacy',
  description: 'A private/public setting.',
  type: 'string',
  enum: ['private', 'public'],
  errors: {
    invalid: 'Only "private" or "public" are permitted.',
    missing: 'Please enter a privacy setting.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
