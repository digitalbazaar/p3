var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;
var tools = bedrock.tools;

var currency = require('./currency');
var money = require('./money');

var schema = {
  required: true,
  title: 'Transfer',
  description: 'A financial Transfer.',
  type: 'object',
  properties: {
    type: schemas.jsonldType('Transfer'),
    source: schemas.url(),
    destination: schemas.url(),
    amount: money.precisePositive(),
    currency: currency(),
    comment: schemas.comment()
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
