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
    }
  }, {
    type: 'object',
    properties: {
      type: {
        required: true,
        type: 'string',
        enum: ['ps:FinancialAccount']
      },
      owner: {
        required: true,
        type: payswarmId()
      },
      psaSlug: slug()
    }
  }]
};

module.exports.postIdentifier = function() {
  return postIdentifier;
};
