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
      type: jsonldType('com:PayeeRule'),
      accountOwnerType: {
        required: false,
        enum: ['ps:Authority']
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
        enum: ['com:FlatAmount', 'com:PercentExclusive', 'com:PercentInclusive']
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
