var payswarmId = require('./payswarmId');
var label = require('./label');
var privacy = require('./privacy');
var jsonldContext = require('./jsonldContext');

var postAccounts = {
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    psaSlug: {
      required: true,
      type: payswarmId()
    },
    label: {
      required: true,
      type: label()
    },
    psaPrivacy: {
      required: false,
      type: privacy()
    },
    currency: {
      required: true,
      type: 'string',
      enum: ['USD']
    }
  },
  additionalProperties: false
};

var postAccount = {
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    id: payswarmId(),
    label: {
      required: true,
      type: label()
    },
    psaPrivacy: {
      required: false,
      type: privacy()
    }
  },
  additionalProperties: false
};

module.exports.postAccounts = function() {
  return postAccounts;
};
module.exports.postAccount = function() {
  return postAccount;
};
