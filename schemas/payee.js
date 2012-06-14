var tools = require('../lib/payswarm-auth/payswarm.tools');

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
      'com:destination': payswarmId(),
      'com:rate': money.precisePositive(),
      'com:rateType': {
        required: true,
        type: 'string',
        enum: ['com:FlatAmount', 'com:Percentage']
      },
      'rdfs:comment': {
        required: true,
        type: 'string'
      },
      'com:rateContext': {
        required: true,
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
      'com:payeePosition': {
        required: true,
        type: 'integer'
      }
    }
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
