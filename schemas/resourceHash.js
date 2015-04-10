var bedrock = require('bedrock');

var schema = {
  title: 'PaySwarm Resource Hash',
  required: true,
  type: 'string',
  pattern: "^urn:sha256:[a-f0-9]{64}$"
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
