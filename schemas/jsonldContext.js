var tools = require('../lib/payswarm-auth/payswarm.tools');

var schema = {
  required: true,
  title: 'JSON-LD context',
  description: 'A JSON-LD Context',
  type: [{
    type: 'string',
    pattern: '^http://purl.org/payswarm/v1$'
  }]
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
