var payswarmId = require('./payswarmId');
var jsonldType = require('./jsonldType');
var deposit = require('./deposit');
var url = require('./url');

var postQuote = {
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

var postContract = {
  type: 'object',
  properties: {
    '@type': jsonldType('com:Transaction', 'ps:Contract')
  }
};

var postDeposit = deposit();

var postWithdrawal = {
  type: 'object',
  properties: {
    '@type': jsonldType('com:Transaction', 'com:Withdrawal')
  }
};

var postPurchaseRequest = {
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
};

var postTransfer = {
  type: 'object',
  properties: {
    '@type': jsonldType('com:Transaction', 'com:Transfer')
  }
};

module.exports.postQuote = function() {
  return postQuote;
};
module.exports.postContract = function() {
  return postContract;
};
module.exports.postDeposit = function() {
  return postDeposit;
};
module.exports.postWithdrawal = function() {
  return postWithdrawal;
};
module.exports.postPurchaseRequest = function() {
  return postPurchaseRequest;
};
module.exports.postTransfer = function() {
  return postTransfer;
};
