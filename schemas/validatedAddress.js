var address = require('./address');
var tools = require('../lib/payswarm-auth/payswarm.tools');

var schema = address({
  psaValidated: {
    required: false,
    type: 'string',
    pattern: 'true|false'
  },
  psaAddressHash: {
    required: false,
    type: 'string'
  }
});

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
