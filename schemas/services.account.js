var currency = require('./currency');
var jsonldContext = require('./jsonldContext');
var label = require('./label');
var money = require('./money');
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
    },
    backupSource: {
      required: false,
      type: 'array',
      uniqueItems: true,
      minLength: 1,
      items: {
        type: payswarmId()
      }
    },
    psaAllowInstantTransfer: {
      required: false,
      type: 'boolean'
    },
    psaMinInstantTransfer: money.preciseNonNegative({required: false})
  },
  additionalProperties: false
};

var delAccountQuery = {
  type: 'object',
  properties: {
    backupSource: {
      required: true,
      type: payswarmId()
    }
  },
  additionalProperties: true
};

var postAccountCreditLine = {
  title: 'Open Account Credit Line',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    backupSource: payswarmId({required: false})/*,
    amount: ...*/
  },
  additionalProperties: false
};

var postAccountBackupSource = {
  title: 'Add an Account Backup Source',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    backupSource: payswarmId()
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
module.exports.delAccountQuery = function() {
  return delAccountQuery;
};
module.exports.postAccountCreditLine = function() {
  return postAccountCreditLine;
};
module.exports.postAccountBackupSource = function() {
  return postAccountBackupSource;
};
