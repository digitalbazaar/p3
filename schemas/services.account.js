var payswarmId = require('./payswarmId');
var label = require('./label');
var visibility = require('./propertyVisibility');
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
    psaPublic: {
      required: false,
      type: visibility()
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
    psaPublic: {
      required: false,
      type: visibility()
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
