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
        enum: ['ps:Profile', 'ps:PersonalIdentity', 'ps:VendorIdentity']
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
        enum: ['com:Account']
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
