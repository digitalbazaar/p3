var bedrock = require('bedrock');

var schema = {
  title: 'PaySwarm Transaction Reference ID',
  required: true,
  type: 'string',
  // do not start with 'payswarm', 1-128 chars in length
  pattern: "^(?!payswarm).{1,128}$"
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
