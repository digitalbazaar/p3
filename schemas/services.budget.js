var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var label = require('./label');
var money = require('./money');
var payswarmId = require('./payswarmId');
var refreshInterval = require('./refreshInterval');
var validityInterval = require('./validityInterval');

var postBudget = {
  title: 'Budget',
  description: 'A budget or a vendor to add to an existing budget.',
  type: [{
    type: 'object',
    properties: {
      '@context': jsonldContext(),
      id: payswarmId(),
      type: jsonldType('Budget'),
      label: label({required: false}),
      source: payswarmId({required: false}),
      amount: money.precisePositive({required: false}),
      vendor: payswarmId({required: false}),
      psaMaxPerUse: money.precisePositive({required: false}),
      psaRefreshInterval: refreshInterval({required: false}),
      psaValidityInterval: validityInterval({required: false})
    }
  }, {
    type: 'object',
    properties: {
      '@context': jsonldContext(),
      vendor: payswarmId()
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
    '@context': jsonldContext(),
    type: jsonldType('Budget'),
    label: label(),
    source: payswarmId(),
    amount: money.precisePositive(),
    vendor: payswarmId({required: false}),
    psaMaxPerUse: money.precisePositive({required: false}),
    psaRefreshInterval: refreshInterval({required: false}),
    psaValidityInterval: validityInterval({required: false})
  },
  additionalProperties: false
};

var delBudgetQuery = {
  type: 'object',
  properties: {
    vendor: {
      required: false,
      type: payswarmId()
    }
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
