var bedrock = require('bedrock');

var address = require('./address');

var schema = address({
  properties: {
    sysValidated: {
      required: false,
      type: 'boolean'
    },
    sysAddressHash: {
      required: false,
      type: 'string'
    }
  }
});

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
