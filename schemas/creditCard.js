var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;
var tools = bedrock.tools;

var address = require('./address');

var currentYear = new Date().getFullYear();

var schema = {
  required: true,
  title: 'CreditCard',
  description: 'A credit or debit card.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: schemas.jsonldType('CreditCard'),
    cardBrand: {
      required: true,
      type: 'string',
      enum: [
        'Visa', 'MasterCard', 'Discover', 'AmericanExpress', 'ChinaUnionPay'
      ]
    },
    cardNumber: {
      required: true,
      type: 'string',
      pattern: '^[0-9]{16}$',
      errors: {
        invalid: 'The card number must be 16 digits in length.',
        missing: 'Please enter a card number.',
        mask: true
      }
    },
    cardExpMonth: {
      required: true,
      type: 'integer',
      minimum: 1,
      maximum: 12,
      errors: {
        invalid: 'The card expiration month must be an integer between 1 and 12.',
        missing: 'Please enter a card expiration month.',
        mask: true
      }
    },
    cardExpYear: {
      required: true,
      type: 'integer',
      minimum: currentYear,
      maximum: currentYear + 10,
      errors: {
        invalid: 'The card expiration year must be an integer between ' +
          currentYear + ' and ' + (currentYear + 10) + '.',
        missing: 'Please enter a card expiration year.',
        mask: true
      }
    },
    address: address(),
    cardCvm: {
      required: true,
      type: 'string',
      pattern: '^[0-9]{3,4}$',
      errors: {
        invalid: 'The Card Verification Method (CVM) must be either 3 or 4 ' +
          'digits in length.',
        missing: 'Please enter a Card Verification Method (CVM) code.',
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
