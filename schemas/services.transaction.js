var deposit = require('./deposit');
var graphSignature = require('./graphSignature');
var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payswarmId = require('./payswarmId');
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

var postDeposit = deposit('all');

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
    title: 'Purchase Request',
    description: 'Contains all of the details required to perform a purchase',
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
        title: 'Asset Reference Identifier',
        description: 'A unique serial number associated with the asset purchase.',
        required: false,
        type: 'string'
      },
      signature: graphSignature({required: false})
    },
    additionalProperties: false
  }, {
    type: 'object',
    title: 'Pre-approved Purchase Request',
    description: 'A purchase request containing a pre-assigned transactionId.',
    properties: {
      '@context': jsonldContext(),
      type: jsonldType('ps:PurchaseRequest'),
      transactionId: payswarmId(),
      nonce: {
        type: 'string'
      },
      signature: graphSignature({required: false})
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
