var constants = require('bedrock').config.constants;
var schemas = require('bedrock-validation').schemas;

var money = require('./money');
var refreshInterval = require('./refreshInterval');
var validityInterval = require('./validityInterval');

var postBudget = {
  title: 'Budget',
  description: 'A budget or a vendor to add to an existing budget.',
  type: [{
    type: 'object',
    properties: {
      '@context': schemas.jsonldContext(constants.PAYSWARM_CONTEXT_V1_URL),
      id: schemas.url(),
      type: schemas.jsonldType('Budget'),
      label: schemas.label({required: false}),
      source: schemas.url({required: false}),
      amount: money.precisePositive({required: false}),
      vendor: schemas.url({required: false}),
      sysMaxPerUse: money.precisePositive({required: false}),
      sysRefreshInterval: refreshInterval({required: false}),
      sysValidityInterval: validityInterval({required: false})
    }
  }, {
    type: 'object',
    properties: {
      '@context': schemas.jsonldContext(constants.PAYSWARM_CONTEXT_V1_URL),
      id: schemas.url(),
      vendor: schemas.url()
    }
  }],
  additionalProperties: false
};

var getBudgetQuery = {
  type: 'object',
  properties: {
    view: {
      required: false,
      type: 'string',
      enum: ['vendors']
    }
  },
  additionalProperties: true
};

var postBudgets = {
  title: 'Budget',
  description: 'A budget that is being created for the first time.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.PAYSWARM_CONTEXT_V1_URL),
    type: schemas.jsonldType('Budget'),
    label: schemas.label(),
    source: schemas.url(),
    amount: money.precisePositive(),
    vendor: schemas.url({required: false}),
    sysMaxPerUse: money.precisePositive({required: false}),
    sysRefreshInterval: refreshInterval({required: false}),
    sysValidityInterval: validityInterval({required: false})
  },
  additionalProperties: false
};

var delBudgetQuery = {
  type: 'object',
  properties: {
    vendor: schemas.url({required: false})
  },
  additionalProperties: true
};

module.exports.postBudget = function() {
  return postBudget;
};
module.exports.getBudgetQuery = function() {
  return getBudgetQuery;
};
module.exports.postBudgets = function() {
  return postBudgets;
};
module.exports.delBudgetQuery = function() {
  return delBudgetQuery;
};
