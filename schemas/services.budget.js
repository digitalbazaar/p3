var payswarmId = require('./payswarmId');
var label = require('./label');
var money = require('./money');

var postBudget = {
  type: 'object',
  properties: {
    label: label({required: false}),
    source: payswarmId({required: false}),
    amount: money.precisePositive({required: false}),
    vendor: payswarmId({required: false}),
    psaExpires: {
      required: false,
      type: [{
        type: 'integer',
        minimum: 0,
        exclusiveMinimum: true,
      }, {
        type: 'string',
        enum: ['']
      }]
    },
    psaMaxPerUse: money.precisePositive({required: false}),
    psaRefresh: {
      type: 'string',
      enum: ['psa:Hourly', 'psa:Daily', 'psa:Monthly', 'psa:Yearly'],
      required: false
    }
  }
};

var postBudgets = {
  type: 'object',
  properties: {
    label: label(),
    source: payswarmId(),
    amount: money.precisePositive(),
    vendor: payswarmId({required: false}),
    psaExpires: {
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: true
    },
    psaMaxPerUse: money.precisePositive({required: false}),
    psaRefresh: {
      type: 'string',
      enum: ['psa:Hourly', 'psa:Daily', 'psa:Monthly', 'psa:Yearly'],
    }
  }
};

module.exports.postBudget = function() {
  return postBudget;
};
module.exports.postBudgets = function() {
  return postBudgets;
};
