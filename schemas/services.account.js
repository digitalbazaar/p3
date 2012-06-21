var payswarmId = require('./payswarmId');
var label = require('./label');
var privacy = require('./privacy');

var postAccounts = {
  type: 'object',
  properties: {
    psaSlug: {
      required: true,
      type: payswarmId()
    },
    label: {
      required: true,
      type: label()
    },
    privacy: {
      required: false,
      type: privacy()
    },
    currency: {
      required: true,
      type: 'string',
      enum: ['USD']
    }
  }
};

var postAccount = {
  type: 'object',
  properties: {
    label: {
      required: true,
      type: label()
    },
    psaPrivacy: {
      required: false,
      type: privacy()
    }
  }
};

module.exports.postAccounts = function() {
  return postAccounts;
};
module.exports.postAccount = function() {
  return postAccount;
};
