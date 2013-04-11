var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payee = require('./payee');
var payeeRule = require('./payeeRule');
var payswarmId = require('./payswarmId');
var url = require('./url');
var vendor = require('./vendor');
var w3cDateTime = require('./w3cDateTime');

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
      type: payswarmId()
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
    '@context': jsonldContext(),
    // allow up to 4 additional custom types
    type: jsonldType('Listing', 4),
    vendor: vendor(),
    payee: payee({required: false}),
    payeeRule: payeeRule({required: false}),
    asset: url(),
    assetHash: {
      required: false,
      type: 'string'
    },
    license: url(),
    licenseHash: {
      required: true,
      type: 'string'
    }
  },
  additionalProperties: false
};

var postListing = {
  title: 'Edit Listing',
  description: 'Contains all of the details required to edit a Listing.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    // allow up to 4 additional custom types
    type: jsonldType('Listing', 4),
    vendor: vendor(),
    payee: payee({required: false}),
    payeeRule: payeeRule({required: false}),
    asset: url(),
    assetHash: {
      required: false,
      type: 'string'
    },
    license: url(),
    licenseHash: {
      required: true,
      type: 'string'
    },
    psaPublished: w3cDateTime({required: false})
  },
  additionalProperties: false
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
