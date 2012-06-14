var payswarmId = require('./payswarmId');
var label = require('./label');
var money = require('./money');

var postBudget = {
  type: 'object',
  properties: {
    'rdfs:label': label({required: false}),
    'com:account': payswarmId({required: false}),
    'com:amount': money.precisePositive({required: false}),
    'com:vendor': payswarmId({required: false}),
    'psa:expires': {
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
    'psa:maxPerUse': money.precisePositive({required: false}),
    'psa:refresh': {
      type: 'string',
      enum: ['psa:Hourly', 'psa:Daily', 'psa:Monthly', 'psa:Yearly'],
      required: false
    }
  }
};

var postBudgets = {
  type: 'object',
  properties: {
    'rdfs:label': label(),
    'com:account': payswarmId(),
    'com:amount': money.precisePositive(),
    'com:vendor': payswarmId({required: false}),
    'psa:expires': {
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: true
    },
    'psa:maxPerUse': money.precisePositive({required: false}),
    'psa:refresh': {
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
