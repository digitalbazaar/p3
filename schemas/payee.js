var tools = require('../lib/payswarm-auth/tools');

var payswarmId = require('./payswarmId');
var money = require('./money');

var schema = {
  required: true,
  title: 'Payee',
  description: 'A set of Payees.',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: payswarmId({required: false}),
      type: {
        type: 'string',
        pattern: '^com:Payee$',
      },
      destination: payswarmId(),
      payeeRate: money.precisePositive(),
      payeeRateType: {
        required: true,
        type: 'string',
        enum: ['com:FlatAmount', 'com:Percentage']
      },
      comment: {
        required: false,
        type: 'string'
      },
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
      payeePosition: {
        required: false,
        type: 'integer'
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
