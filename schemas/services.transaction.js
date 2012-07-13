var payswarmId = require('./payswarmId');
var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var deposit = require('./deposit');
var url = require('./url');

var postQuote = {
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    listing: payswarmId(),
    listingHash: {
      type: 'string'
    },
    source: payswarmId(),
    referenceId: {
      required: false,
      type: 'string'
    },
    nonce: {
      required: false,
      type: 'string'
    }
  },
  additionalProperties: false
};

var postContract = {
  type: 'object',
  // FIXME: We should be more precise about what we allow here
  properties: {
    '@context': jsonldContext(),
    type: jsonldType(['com:Transaction', 'ps:Contract'])
  }
};

var postDeposit = deposit();

var postWithdrawal = {
  type: 'object',
  // FIXME: We should be more precise about what we allow here
  properties: {
    '@context': jsonldContext(),
    type: jsonldType(['com:Transaction', 'com:Withdrawal'])
  }
};

var postPurchaseRequest = {
  type: [{
    type: 'object',
    properties: {
      '@context': jsonldContext(),
      type: jsonldType('ps:PurchaseRequest'),
      transactionId: payswarmId(),
      nonce: {
        type: 'string'
      }
    },
    additionalProperties: false
  }, {
    type: 'object',
    properties: {
      '@context': jsonldContext(),
      type: jsonldType('ps:PurchaseRequest'),
      identity: payswarmId(),
      listing: payswarmId(),
      listingHash: {
        type: 'string'
      },
      source: payswarmId({required: false}),
      referenceId: {
        required: false,
        type: 'string'
      }
    },
    additionalProperties: false
  }]
};

var postTransfer = {
  type: 'object',
  // FIXME: We should be more precise about what we allow here
  properties: {
    type: jsonldType(['com:Transaction', 'com:Transfer'])
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
