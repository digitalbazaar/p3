var tools = require(__libdir + '/payswarm-auth/tools');

var schema = {
  required: true,
  title: 'PaySwarm ID',
  description: 'A PaySwarm unique identifier.',
  type: 'string',
  minLength: 1,
  disallow: {
    type: 'string',
    enum: ['0']
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
