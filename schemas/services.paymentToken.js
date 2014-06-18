var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var bankAccount = require('./bankAccount');
var creditCard = require('./creditCard');
var deposit = require('./deposit');
var money = require('./money');

var postPaymentTokens = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    label: schemas.label(),
    source: {
      required: true,
      type: [creditCard(), bankAccount()]
    }
  },
  additionalProperties: false
};

var getPaymentTokensQuery = {
  type: 'object',
  properties: {
    gateway: {
      required: false,
      type: 'string',
      minLength: 1
    }
  },
  additionalProperties: true
};

var postPaymentToken = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    label: {
      required: true,
      type: schemas.label()
    }
  },
  additionalProperties: false
};

var postPaymentTokenQuery = {
  type: 'object',
  properties: {
    action: {
      required: false,
      type: 'string',
      enum: ['restore', 'verify']
    }
  },
  additionalProperties: true
};

var postVerifyPrepare = {
  title: 'Verify PaymentToken Prepare',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    sysVerifyParameters: {
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
module.exports.getPaymentTokensQuery = function() {
  return getPaymentTokensQuery;
};
module.exports.postPaymentToken = function() {
  return postPaymentToken;
};
module.exports.postPaymentTokenQuery = function() {
  return postPaymentTokenQuery;
};
module.exports.postVerifyPrepare = function() {
  return postVerifyPrepare;
};
module.exports.postVerifyDeposit = function() {
  return postVerifyDeposit;
};
