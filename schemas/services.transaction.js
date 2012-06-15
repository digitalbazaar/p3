var payswarmId = require('./payswarmId');
var jsonldType = require('./jsonldType');
var deposit = require('./deposit');
var url = require('./url');

var postTransactionsQuote = {
  type: 'object',
  properties: {
    'ps:listing': payswarmId(),
    'ps:listingHash': {
      type: 'string'
    },
    'com:source': payswarmId(),
    'com:referenceId': {
      required: false,
      type: 'string'
    },
    'sec:nonce': {
      required: false,
      type: 'string'
    }
  }
};

var postTransactions = {
  type: [
    // post deposit
    deposit, {
    // post contract
    type: 'object',
    properties: {
      '@type': jsonldType('com:Transaction', 'ps:Contract')
    }
  }, {
    // post withdrawal
    type: 'object',
    properties: {
      '@type': jsonldType('com:Transaction', 'com:Withdrawal')
    }
  }, {
    // post purchase request
    type: 'object',
    properties: {
      '@type': jsonldType('com:Transaction', 'ps:PurchaseRequest'),
      'ps:transactionId': payswarmId(),
      'callback': url({required: false}),
      'sec:nonce': {
        required: false,
        type: 'string'
      }
    }
  }]
};

module.exports.postTransactionsQuote = function() {
  return postTransactionsQuote;
};
module.exports.postTransactions = function() {
  return postTransactions;
};
