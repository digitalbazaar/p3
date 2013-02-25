var tools = require('../lib/payswarm-auth/tools');

var payswarmId = require('./payswarmId');
var jsonldType = require('./jsonldType');
var money = require('./money');

var schema = {
  required: true,
  title: 'PayeeRule',
  description: 'A Payee rule.',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: payswarmId(),
      type: jsonldType('PayeeRule'),
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
        required: true,
        type: 'string',
        enum: ['FlatAmount', 'Percentage']
      },
      payeeApplyType: {
        required: true,
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
