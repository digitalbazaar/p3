var tools = require('../lib/payswarm-auth/payswarm.tools');

var jsonldType = require('./jsonldType');
var address = require('./address');

var schema = {
  required: true,
  title: 'CreditCard',
  description: 'A credit card.',
  type: 'object',
  properties: {
    '@type': jsonldType('ccard:CreditCard'),
    'ccard:brand': {
      required: true,
      type: 'string',
      enum: ['ccard:Visa', 'ccard:Mastercard', 'ccard:Discover']
    },
    'ccard:number': {
      required: true,
      type: 'string',
      pattern: '^[0-9]{16}$',
      errors: {
        invalid: 'The credit card number must be 16 digits in length.',
        missing: 'Please enter a credit card number.'
      }
    },
    'ccard:expMonth': {
      required: true,
      type: 'string',
      pattern: '^[0-9]{2}$',
      errors: {
        invalid: 'The credit card expiration month must be 2 digits in length.',
        missing: 'Please enter a credit card expiration month.'
      }
    },
    'ccard:expYear': {
      required: true,
      type: 'string',
      pattern: '^[0-9]{2}$',
      errors: {
        invalid: 'The credit card expiration year must be 2 digits in length.',
        missing: 'Please enter a credit card expiration year.'
      }
    },
    'ccard:address': address(),
    'ccard:cvm': {
      required: true,
      type: 'string',
      pattern: '^[0-9]{3,4}$',
      errors: {
        invalid: 'The Card Verification Method (CVM) must be either 3 or 4 ' +
          'digits in length.',
        missing: 'Please enter a Card Verification Method (CVM) code.'
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
