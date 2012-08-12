var tools = require('../lib/payswarm-auth/tools');

var jsonldType = require('./jsonldType');
var address = require('./address');

var schema = {
  required: true,
  title: 'CreditCard',
  description: 'A credit card.',
  type: 'object',
  properties: {
    type: jsonldType('ccard:CreditCard'),
    cardBrand: {
      required: true,
      type: 'string',
      enum: ['ccard:Visa', 'ccard:Mastercard', 'ccard:Discover']
    },
    cardNumber: {
      required: true,
      type: 'string',
      pattern: '^[0-9]{16}$',
      errors: {
        invalid: 'The credit card number must be 16 digits in length.',
        missing: 'Please enter a credit card number.'
      }
    },
    cardExpMonth: {
      required: true,
      type: 'string',
      pattern: '^[0-9]{2}$',
      errors: {
        invalid: 'The credit card expiration month must be 2 digits in length.',
        missing: 'Please enter a credit card expiration month.'
      }
    },
    cardExpYear: {
      required: true,
      type: 'string',
      pattern: '^[0-9]{2}$',
      errors: {
        invalid: 'The credit card expiration year must be 2 digits in length.',
        missing: 'Please enter a credit card expiration year.'
      }
    },
    cardAddress: address(),
    cardCvm: {
      required: true,
      type: 'string',
      pattern: '^[0-9]{3,4}$',
      errors: {
        invalid: 'The Card Verification Method (CVM) must be either 3 or 4 ' +
          'digits in length.',
        missing: 'Please enter a Card Verification Method (CVM) code.'
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
