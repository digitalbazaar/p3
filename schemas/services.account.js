var currency = require('./currency');
var jsonldContext = require('./jsonldContext');
var label = require('./label');
var payswarmId = require('./payswarmId');
var slug = require('./slug');
var visibility = require('./propertyVisibility');

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
    psaSlug: slug(),
    label: {
      required: true,
      type: label()
    },
    psaPublic: {
      required: false,
      type: visibility()
    },
    currency: currency()
  },
  additionalProperties: false
};

var getAccountQuery = {
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

var postAccountCreditLine = {
  type: 'object',
  properties: {
    '@context': jsonldContext()/*,
    amount: ...*/
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
module.exports.postAccountCreditLine = function() {
  return postAccountCreditLine;
};
