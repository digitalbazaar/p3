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
      payeeGroup: {
        required: true,
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
      payeeApplyAfter: {
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
      payeeApplyGroup: {
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
      payeeExemptGroup: {
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
      payeeRate: money.precisePositive(),
      payeeRateType: {
        required: true,
        type: 'string',
        enum: ['com:FlatAmount', 'com:Percent']
      },
      payeeApplyType: {
        required: true,
        type: 'string',
        enum: ['com:Exclusive', 'com:Inclusive']
      },
      comment: {
        required: false,
        type: 'string'
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
