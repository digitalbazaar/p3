var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var deposit = require('./deposit');
var referenceId = require('./referenceId');
var resourceHash = require('./resourceHash');
var withdrawal = require('./withdrawal');

var getTransactionsQuery = {
  type: 'object',
  properties: {
    form: {
      required: false,
      type: 'string',
      enum: ['pay']
    },
    listing: schemas.url({required: false}),
    'listing-hash': resourceHash({required: false}),
    'reference-id': referenceId({required: false}),
    callback: schemas.url({required: false}),
    'response-nonce': schemas.nonce({required: false}),
    createdStart: schemas.w3cDateTime({required: false}),
    createdEnd: schemas.w3cDateTime({required: false}),
    account: schemas.url({required: false}),
    previous: schemas.url({required: false}),
    limit: {
      required: false,
      // query param will be a string but content is an integer from 1 to 30.
      type: 'string',
      pattern: '^([1-9]|[12][0-9]|30)$'
    }
  },
  additionalProperties: true
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
  additionalProperties: true
};

var postQuote = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    listing: schemas.url(),
    listingHash: resourceHash(),
    source: schemas.url(),
    referenceId: referenceId({required: false}),
    nonce: schemas.nonce({required: false})
  },
  additionalProperties: false
};

var postContract = {
  type: 'object',
  // FIXME: We should be more precise about what we allow here
  properties: {
    '@context': schemas.jsonldContext(),
    type: schemas.jsonldType(['Transaction', 'Contract'])
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
      '@context': schemas.jsonldContext(),
      type: schemas.jsonldType('PurchaseRequest'),
      identity: schemas.url(),
      listing: schemas.url(),
      listingHash: resourceHash(),
      source: schemas.url({required: false}),
      referenceId: {
        title: 'Asset Reference Identifier',
        description: 'A unique serial number associated with the asset purchase.',
        required: false,
        type: 'string'
      },
      signature: schemas.graphSignature({required: false})
    },
    additionalProperties: false
  }, {
    type: 'object',
    title: 'Pre-approved Purchase Request',
    description: 'A purchase request containing a pre-assigned transactionId.',
    properties: {
      '@context': schemas.jsonldContext(),
      type: schemas.jsonldType('PurchaseRequest'),
      transactionId: schemas.url(),
      nonce: schemas.nonce({required: false}),
      signature: schemas.graphSignature({required: false})
    },
    additionalProperties: false
  }]
};

var postTransfer = {
  type: 'object',
  // FIXME: we should be more precise about what we allow here
  properties: {
    type: schemas.jsonldType(['Transaction'])
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
