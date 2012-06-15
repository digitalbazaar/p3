var payswarmId = require('./payswarmId');
var label = require('./label');
var privacy = require('./privacy');

var postAccounts = {
  type: 'object',
  properties: {
    'psa:slug': {
      required: true,
      type: payswarmId()
    },
    'rdfs:label': {
      required: true,
      type: label()
    },
    'psa:privacy': {
      required: false,
      type: privacy()
    },
    'com:currency': {
      required: true,
      type: 'string',
      enum: ['USD']
    }
  }
};

var postAccount = {
  type: 'object',
  properties: {
    'rdfs:label': {
      required: true,
      type: label()
    },
    'psa:privacy': {
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
