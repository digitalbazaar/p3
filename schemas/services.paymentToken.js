var label = require('./label');
var creditCard = require('./creditCard');
var bankAccount = require('./bankAccount');
var jsonldContext = require('./jsonldContext');
var money = require('./money');

var postPaymentTokens = {
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    label: label(),
    paymentGateway: {
      type: 'string',
      minLength: 1,
      errors: {
        missing: 'No payment gateway was specified.'
      }
    },
    source: {
      type: [creditCard(), bankAccount()]
    }
  },
  additionalProperties: false
};

var postVerify = {
  type: 'object',
  properties: {
    amounts: {
      type: 'array',
      minItems: 2,
      items: money.precisePositive()
    },
    errors: {
      invalid: 'The given amounts are not valid monetary amounts.',
      missing: 'The two verification amounts must be given.'
    }
  },
  additionalProperties: false
};

module.exports.postPaymentTokens = function() {
  return postPaymentTokens;
};

module.exports.postVerify = function() {
  return postVerify;
};
