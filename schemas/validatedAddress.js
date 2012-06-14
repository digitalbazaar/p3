var address = require('./address');
var tools = require('../lib/payswarm-auth/payswarm.tools');

var schema = address({});
address['psa:validated'] = {
  required: false,
  type: 'string',
  pattern: 'true|false'
};
address['psa:addressHash'] = {
  required: false,
  type: 'string'
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
