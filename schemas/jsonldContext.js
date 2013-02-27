var tools = require('../lib/payswarm-auth/tools');

var schema = {
  required: true,
  title: 'JSON-LD context',
  description: 'A JSON-LD Context',
  type: [{
    type: 'string',
    pattern: '^https://w3id.org/payswarm/v1$'
  }]
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
