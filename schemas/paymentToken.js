var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;

var schema = {
  required: true,
  title: 'Payment Token',
  description: 'A tokenized source of monetary funds.',
  type: [{
    type: 'object',
    properties: {
      id: schemas.url(),
      type: schemas.jsonldType('PaymentToken'),
      owner: schemas.url(),
      paymentToken: {
        required: true,
        type: 'string'
      },
      paymentGateway: {
        required: true,
        type: 'string',
        minLength: 1,
        errorMessage: 'Gateway too short; 1 character minimum.'
      },
      paymentMethod: {
        required: true,
        type: 'string',
        enum: ['CreditCard', 'BankAccount']
      }
    }
  }],
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
