var bedrock = require('bedrock');
var tools = bedrock.tools;

var schema = {
  title: 'PaySwarm Transaction Reference ID',
  required: true,
  type: 'string',
  // do not start with 'payswarm', 1-128 chars in length
  pattern: "^(?!payswarm).{1,128}$"
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
