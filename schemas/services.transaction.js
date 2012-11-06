var deposit = require('./deposit');
var graphSignature = require('./graphSignature');
var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var nonce = require('./nonce');
var payswarmId = require('./payswarmId');
var url = require('./url');
var withdrawal = require('./withdrawal');

var getTransactionsQuery = {
  type: 'object',
  properties: {
    form: {
      required: false,
      type: 'string',
      enum: ['pay']
    },
    listing: {
      required: false,
      type: url()
    },
    'listing-hash': {
      required: false,
      type: 'string'
      // FIXME
    },
    'reference-id': {
      required: false,
      type: 'string',
      minLength: 1,
      maxLength: 128
      // FIXME limits ok?
    },
    'callback': {
      required: false,
      type: url()
    },
    'response-nonce': {
      required: false,
      type: nonce()
    },
    createdStart: {
      required: false,
      type: 'string'
      // FIXME w3cDateTime or int or other date format
    },
    createdEnd: {
      required: false,
      type: 'string'
      // FIXME w3cDateTime or int or other date format
    },
    account: {
      required: false,
      type: payswarmId()
    },
    previous: {
      required: false,
      type: payswarmId()
    },
    limit: {
      required: false,
      type: 'integer',
      minimum: 1,
      maximum: 30
    }
  },
  additionalProperties: false
};

var postTransactionsQuery = {
  type: 'object',
  properties: {
    quote: {
      required: false,
      type: 'string',
      enum: ['true']
    }
  },
  additionalProperties: false
};

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
      type: nonce()
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

var postWithdrawal = withdrawal('all');

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

module.exports.getTransactionsQuery = function() {
  return getTransactionsQuery;
};
module.exports.postTransactionsQuery = function() {
  return postTransactionsQuery;
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
