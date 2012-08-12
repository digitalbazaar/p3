var tools = require('../lib/payswarm-auth/tools');

var payswarmId = require('./payswarmId');
var jsonldType = require('./jsonldType');
var label = require('./label');

var schema = {
  required: true,
  title: 'Payment Token',
  description: 'A tokenized source of monetary funds.',
  type: [{
    type: 'object',
    properties: {
      id: payswarmId(),
      type: jsonldType('com:PaymentToken'),
      owner: payswarmId(),
      paymentToken: {
        required: true,
        type: 'string'
      },
      paymentGateway: {
        required: true,
        type: 'string',
        minLength: 1,
        errorMessage: 'Gateway too short; 1 character minimum.'
      },
      paymentMethod: {
        required: true,
        type: 'string',
        enum: ['ccard:CreditCard', 'bank:BankAccount']
      }
    }
  }],
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
