var tools = require('../lib/payswarm-auth/tools');

var jsonldType = require('./jsonldType');

var schema = {
  required: true,
  title: 'BankAccount',
  description: 'A bank account.',
  type: 'object',
  properties: {
    type: jsonldType('bank:BankAccount'),
    bankAccount: {
      required: true,
      type: 'string',
      pattern: '^[0-9]+$',
      errors: {
        missing: 'Please enter a bank account number.'
      }
    },
    bankRoutingNumber: {
      required: true,
      type: 'string',
      pattern: '^[0-9]+$',
      errors: {
        missing: 'Please enter a bank account routing number.'
      }
    }
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
