var payswarmId = require('./payswarmId');
var label = require('./label');
var visibility = require('./propertyVisibility');
var jsonldContext = require('./jsonldContext');

var getAccountsQuery = {
  type: 'object',
  properties: {
    view: {
      required: false,
      type: 'string',
      enum: ['activity']
    }
  },
  additionalProperties: true
};

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

var getAccountQuery = {
  type: 'object',
  properties: {
    activity: {
      required: false,
      type: 'string',
      enum: ['activity']
    }
  },
  additionalProperties: true
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

module.exports.getAccountsQuery = function() {
  return getAccountsQuery;
};
module.exports.postAccounts = function() {
  return postAccounts;
};
module.exports.getAccountQuery = function() {
  return getAccountQuery;
};
module.exports.postAccount = function() {
  return postAccount;
};
