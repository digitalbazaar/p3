var bedrock = require('bedrock');
var tools = bedrock.tools;

var address = require('./address');

var schema = address({
  properties: {
    psaValidated: {
      required: false,
      type: 'boolean'
    },
    psaAddressHash: {
      required: false,
      type: 'string'
    }
  }
});

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
