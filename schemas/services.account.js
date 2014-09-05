var bedrock = require('bedrock');
var schemas = bedrock.module('validation').schemas;

var currency = require('./currency');
var money = require('./money');
var regulatoryAddress = require('./regulatoryAddress');

var postAccounts = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    sysSlug: schemas.slug(),
    label: schemas.label(),
    sysPublic: schemas.propertyVisibility({required: false}),
    currency: currency()
  },
  additionalProperties: false
};

var postAccount = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    label: schemas.label({required: false}),
    sysPublic: schemas.propertyVisibility({required: false}),
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
    backupSource: schemas.url()
  },
  additionalProperties: true
};

var postAccountCreditLine = {
  title: 'Open Account Credit Line',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
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
    id: schemas.url(),
    backupSource: schemas.url()
  },
  additionalProperties: false
};

var postRegulatoryAddress = {
  type: 'object',
  properties: {
    address: regulatoryAddress(),
    account: {
      required: false,
      type: 'object',
      properties: {
        '@context': schemas.jsonldContext(),
        sysSlug: schemas.slug(),
        label: schemas.label(),
        sysPublic: schemas.propertyVisibility({required: false}),
        currency: currency()
      },
      additionalProperties: false
    }
  }
};

module.exports.postAccounts = function() {
  return postAccounts;
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
module.exports.postRegulatoryAddress = function() {
  return postRegulatoryAddress;
};
