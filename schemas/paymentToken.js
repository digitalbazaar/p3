var tools = require('../lib/payswarm-auth/payswarm.tools');

var payswarmId = require('./payswarmId');
var jsonldType = require('./jsonldType');

var schema = {
  required: true,
  title: 'Payment Token',
  description: 'A tokenized source of monetary funds.',
  type: 'object',
  properties: {
    '@type': jsonldType('com:PaymentToken'),
    'ps:owner': payswarmId(),
    'com:paymentToken': {
      required: true,
      type: 'string'
    },
    'com:gateway': {
      required: false,
      type: 'string',
      minLength: 1,
      errorMessage: 'Gateway too short; 1 character minimum.'
    },
    'com:paymentMethod': {
      required: true,
      type: 'string',
      enum: ['ccard:CreditCard', 'bank:BankAccount']
    }
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
