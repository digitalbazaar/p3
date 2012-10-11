var creditCard = require('./creditCard');
var deposit = require('./deposit');
var bankAccount = require('./bankAccount');
var jsonldContext = require('./jsonldContext');
var label = require('./label');
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

var postVerifyPrepare = {
  title: 'Verify PaymentToken Prepare',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    psaVerifyParameters: {
      title: 'Verify parameters',
      type: 'object',
      properties: {
        amount: {
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
    },
    destination: {
      type: 'string',
      required: false
    },
    amount: money.precisePositive({required: false}),
    errors: {
      invalid: 'The given verification parameters are invalid.',
      missing: 'The verification parameters must be given.'
    }
  },
  additionalProperties: false
};

var postVerifyDeposit = deposit('signed');

module.exports.postPaymentTokens = function() {
  return postPaymentTokens;
};

module.exports.postVerifyPrepare = function() {
  return postVerifyPrepare;
};

module.exports.postVerifyDeposit = function() {
  return postVerifyDeposit;
};
