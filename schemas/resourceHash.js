var bedrock = require('bedrock');
var tools = bedrock.tools;

var schema = {
  title: 'PaySwarm Resource Hash',
  required: true,
  type: 'string',
  pattern: "^urn:sha256:[a-f0-9]{64}$"
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
