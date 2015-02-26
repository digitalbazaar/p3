var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;
var tools = bedrock.tools;

var address = require('./address');

var schema = {
  required: true,
  title: 'BankAccount',
  description: 'A bank account.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: schemas.jsonldType('BankAccount'),
    bankAccount: {
      required: true,
      type: 'string',
      pattern: '^[0-9]+$',
      minLength: 5,
      maxLength: 30,
      errors: {
        invalid: 'The bank account number is invalid.',
        missing: 'Please enter a bank account number.',
        mask: true
      }
    },
    bankAccountType: {
      required: true,
      type: 'string',
      enum: ['Checking', 'Savings']
    },
    bankRoutingNumber: {
      required: true,
      type: 'string',
      pattern: '^[0-9]+$',
      minLength: 9,
      maxLength: 9,
      errors: {
        invalid: 'The bank routing number in invalid.',
        missing: 'Please enter a bank account routing number.',
        mask: true
      }
    },
    address: address()
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
