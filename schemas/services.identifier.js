var payswarmId = require('./payswarmId');
var slug = require('./slug');

var postIdentifier = {
  type: [{
    type: 'object',
    properties: {
      '@type': {
        required: true,
        type: 'string',
        enum: ['ps:Profile', 'ps:PersonalIdentity', 'ps:VendorIdentity']
      },
      'psa:slug': slug()
    }
  }, {
    type: 'object',
    properties: {
      '@type': {
        required: true,
        type: 'string',
        enum: ['ps:FinancialAccount']
      },
      'ps:owner': {
        required: true,
        type: payswarmId()
      },
      'psa:slug': slug()
    }
  }]
};

module.exports.postIdentifier = function() {
  return postIdentifier;
};
