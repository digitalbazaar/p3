var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;
var tools = bedrock.tools;

var transfer = require('./transfer');
var depositAmount = require('./depositAmount');

var schema = {
  required: true,
  title: 'Transaction',
  description: 'A financial Transaction.',
  type: 'object',
  properties: {
    type: schemas.jsonldType('Transaction'),
    created: schemas.w3cDateTime(),
    // FIXME: seems incorrect to use deposit amount here
    amount: depositAmount(),
    transfer: {
      type: 'array',
      items: transfer()
    }
  },
  additionalProperties: false
};

module.exports.schema = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
