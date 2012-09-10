var tools = require('../lib/payswarm-auth/tools');

var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');

var schema = {
  required: true,
  title: 'BankAccount',
  description: 'A bank account.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    type: jsonldType('bank:BankAccount'),
    bankAccount: {
      required: true,
      type: 'string',
      pattern: '^[0-9]+$',
      errors: {
        invalid: 'The bank account number must be one or more numbers.',
        missing: 'Please enter a bank account number.',
        mask: true
      }
    },
    bankRoutingNumber: {
      required: true,
      type: 'string',
      pattern: '^[0-9]+$',
      errors: {
        invalid: 'The bank routing number must be one or more numbers.',
        missing: 'Please enter a bank account routing number.',
        mask: true
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
