var tools = require('../lib/payswarm-auth/payswarm.tools');

var schema = {
  required: true,
  title: 'PaySwarm ID',
  description: 'An PaySwarm unique identifier.',
  type: 'string',
  minLength: 1,
  disallow: {
    type: 'string',
    enum: ['0']
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
