var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var currency = require('./currency');
var money = require('./money');

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
    '@context': schemas.jsonldContext(),
    sysSlug: schemas.slug(),
    label: {
      required: true,
      type: schemas.label()
    },
    sysPublic: {
      required: false,
      type: schemas.propertyVisibility()
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
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    label: {
      required: true,
      type: schemas.label()
    },
    sysPublic: {
      required: false,
      type: schemas.propertyVisibility()
    },
    backupSource: {
      required: false,
      type: 'array',
      uniqueItems: true,
      items: {
        type: schemas.url()
      }
    },
    sysAllowInstantTransfer: {
      required: false,
      type: 'boolean'
    },
    sysMinInstantTransfer: money.preciseNonNegative({required: false})
  },
  additionalProperties: false
};

var delAccountQuery = {
  type: 'object',
  properties: {
    backupSource: {
      required: true,
      type: schemas.url()
    }
  },
  additionalProperties: true
};

var postAccountCreditLine = {
  title: 'Open Account Credit Line',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    backupSource: schemas.url({required: false})/*,
    amount: ...*/
  },
  additionalProperties: false
};

var postAccountBackupSource = {
  title: 'Add an Account Backup Source',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    backupSource: schemas.url()
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
