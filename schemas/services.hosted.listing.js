var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;

var payee = require('./payee');
var payeeRule = require('./payeeRule');
var vendor = require('./vendor');

var getListingsQuery = {
  type: 'object',
  properties: {
    keywords: {
      required: false,
      type: 'string'
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
    previous: {
      required: false,
      type: schemas.url()
    },
    limit: {
      required: false,
      // query param will be a string but content is an integer from 1 to 30.
      type: 'string',
      pattern: '^([1-9]|[12][0-9]|30)$'
    },
    includeAsset: {
      required: false,
      type: 'string',
      enum: ['true', 'false']
    }
  },
  additionalProperties: true
};

var postListings = {
  title: 'Create Listing',
  description: 'Contains all of the details required to create a new Listing.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    // allow up to 4 additional custom types
    type: schemas.jsonldType('Listing', 4),
    vendor: vendor(),
    payee: payee({required: false}),
    payeeRule: payeeRule({required: false}),
    asset: schemas.url(),
    assetHash: {
      required: false,
      type: 'string'
    },
    license: schemas.url(),
    licenseHash: {
      required: true,
      type: 'string'
    },
    // FIXME: is sysPublished desirable?
    sysPublished: schemas.w3cDateTime({required: false})
  },
  additionalProperties: false
};

var postListing = {
  title: 'Edit Listing',
  description: 'Contains all of the details required to edit a Listing.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    // allow up to 4 additional custom types
    type: schemas.jsonldType('Listing', 4),
    vendor: vendor(),
    payee: payee({required: false}),
    payeeRule: payeeRule({required: false}),
    asset: schemas.url(),
    assetHash: {
      required: false,
      type: 'string'
    },
    license: schemas.url(),
    licenseHash: {
      required: true,
      type: 'string'
    },
    sysPublished: schemas.w3cDateTime({required: false})
  },
  additionalProperties: false
};

var postReceipt = {
  title: 'Process Receipt',
  description: 'Contains a JSON-encoded receipt to be processed.',
  type: 'object',
  properties: {
    receipt: {
      required: true,
      type: 'string'
    }
  }
};

module.exports.getListingsQuery = function() {
  return getListingsQuery;
};
module.exports.postListings = function() {
  return postListings;
};
module.exports.postListing = function() {
  return postListing;
};
module.exports.postReceipt = function() {
  return postReceipt;
};
