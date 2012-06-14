var label = require('./label');
var creditCard = require('./creditCard');
var bankAccount = require('./bankAccount');

var postPaymentTokens = {
  type: 'object',
  properties: {
    'rdfs:label': label(),
    'com:gateway': {
      type: 'string',
      minLength: 1,
      errors: {
        missing: 'No payment gateway was specified.'
      }
    },
    'com:source': {
      type: [creditCard, bankAccount]
    }
  }
};

module.exports.postPaymentTokens = function() {
  return postPaymentTokens;
};
