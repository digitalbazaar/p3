var payswarmId = require('./payswarmId');
var label = require('./label');
var money = require('./money');
var jsonldContext = require('./jsonldContext');

var postBudget = {
  title: 'Budget',
  description: 'A budget or a vendor to add to an existing budget.',
  type: [{
    type: 'object',
    properties: {
      '@context': jsonldContext(),
      id: payswarmId(),
      label: label({required: false}),
      source: payswarmId({required: false}),
      amount: money.precisePositive({required: false}),
      vendor: payswarmId({required: false}),
      psaExpires: {
        required: false,
        title: 'Expiration date',
        description: 'The number of seconds of spending inactivity before the budget is deleted.',
        type: {
          type: 'integer',
          minimum: 0,
          exclusiveMinimum: true
        }
      },
      psaMaxPerUse: money.precisePositive({required: false}),
      psaRefresh: {
        required: false,
        title: 'Refresh period',
        description: 'The period on which the budget refills to the original amount.',
        type: 'string',
        enum: ['psa:Never', 'psa:Hourly', 'psa:Daily', 'psa:Monthly', 'psa:Yearly']
      }
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

var postBudgets = {
  title: 'Budget',
  description: 'A budget that is being created for the first time.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    label: label(),
    source: payswarmId(),
    amount: money.precisePositive(),
    vendor: payswarmId({required: false}),
    psaExpires: {
      required: true,
      title: 'Expiration date',
      description: 'The number of seconds of spending inactivity before the budget is deleted.',
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: true
    },
    psaMaxPerUse: money.precisePositive({required: false}),
    psaRefresh: {
      required: false,
      title: 'Refresh period',
      description: 'The period on which the budget refills to the original amount.',
      type: 'string',
      enum: ['psa:Never', 'psa:Hourly', 'psa:Daily', 'psa:Monthly', 'psa:Yearly']
    }
  },
  additionalProperties: false
};

module.exports.postBudget = function() {
  return postBudget;
};
module.exports.postBudgets = function() {
  return postBudgets;
};
