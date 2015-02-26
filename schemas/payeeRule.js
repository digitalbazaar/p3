var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;
var tools = bedrock.tools;

var money = require('./money');

var schema = {
  required: true,
  title: 'PayeeRule',
  description: 'A Payee rule.',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: schemas.url({required: false}),
      type: schemas.jsonldType('PayeeRule'),
      payeeGroupPrefix: {
        required: false,
        type: 'array',
        items: {
          type: 'string'
        }
      },
      maximumPayeeRate: money.precisePositive({required: false}),
      minimumPayeeRate: money.precisePositive({required: false}),
      payeeGroup: {
        required: false,
        type: [{
          type: 'string'
        }, {
          type: 'array',
          uniqueItems: true,
          items: {
            type: 'string'
          }
        }]
      },
      payeeRateType: {
        required: false,
        type: 'string',
        enum: ['FlatAmount', 'Percentage']
      },
      payeeApplyType: {
        required: false,
        type: 'string',
        enum: ['ApplyExclusively', 'ApplyInclusively']
      }
    },
    additionalProperties: false
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
