var tools = require('../lib/payswarm-auth/payswarm.tools');

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
      type: jsonldType('com:PayeeRule'),
      accountOwnerType: {
        required: false,
        enum: ['ps:Authority']
      },
      maximumPayeeRate: money.precisePositive({required: false}),
      payeeRateContext: {
        required: false,
        type: [{
          type: 'string',
          enum: [
            'com:Exclusive',
            'com:Inclusive',
            'com:Tax',
            'com:TaxExempt',
            'com:Deferred',
            'com:Cumulative'
          ]
        }, {
          type: 'array',
          minItems: 1,
          uniqueItems: true,
          items: {
            type: 'string',
            enum: [
              'com:Exclusive',
              'com:Inclusive',
              'com:Tax',
              'com:TaxExempt',
              'com:Deferred',
              'com:Cumulative'
            ]
          }
        }]
      },
      payeeRateType: {
        required: true,
        type: 'string',
        enum: ['com:FlatAmount', 'com:Percentage']
      }
    }
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
