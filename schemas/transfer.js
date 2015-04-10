var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;

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
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
