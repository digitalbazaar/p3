var email = require('./email');
var payswarmId = require('./payswarmId');
var slug = require('./slug');

var postIdentifier = {
  type: [{
    type: 'object',
    properties: {
      type: {
        required: true,
        type: 'string',
        enum: ['Profile', 'PersonalIdentity', 'VendorIdentity']
      },
      psaSlug: slug()
    },
    additionalProperties: false
  }, {
    type: 'object',
    properties: {
      type: {
        required: true,
        type: 'string',
        enum: ['FinancialAccount']
      },
      owner: {
        required: true,
        type: payswarmId()
      },
      psaSlug: slug()
    },
    additionalProperties: false
  }, {
    type: 'object',
    properties: {
      type: {
        required: true,
        type: 'string',
        enum: ['email']
      },
      email: email()
    },
    additionalProperties: false
  }]
};

module.exports.postIdentifier = function() {
  return postIdentifier;
};
