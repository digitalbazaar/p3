var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payee = require('./payee');
var payeeRule = require('./payeeRule');
var payswarmId = require('./payswarmId');
var url = require('./url');
var vendor = require('./vendor');
var w3cDateTime = require('./w3cDateTime');

var getAssetsQuery = {
  title: 'GET Hosted Asset Query',
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
    }
  },
  additionalProperties: true
};

var postAssets = {
  title: 'Create Asset',
  description: 'Contains all of the details required to create a new Asset.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    // allow up to 4 additional custom types
    type: jsonldType('Asset', 4),
    creator: {
      required: false,
      type: [url(), {type: 'object'}]
    },
    created: w3cDateTime(),
    title: {
      type: 'string',
      required: false
    },
    assetContent: url({required: false}),
    assetProvider: payswarmId(),
    listingRestrictions: {
      title: 'Listing Restrictions',
      description: 'Restrictions on the listing of this Asset for sale.',
      required: false,
      type: 'object',
      properties: {
        payee: payee({required: false}),
        payeeRule: payeeRule({required: false}),
        vendor: vendor({required: false}),
        validFrom: w3cDateTime({required: false}),
        validUntil: w3cDateTime({required: false})
      }
    }
  },
  additionalProperties: false
};

var postAsset = {
  title: 'Edit Asset',
  description: 'Contains all of the details required to edit an Asset.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    // allow up to 4 additional custom types
    type: jsonldType('Asset', 4),
    creator: {
      required: false,
      type: [url(), {type: 'object'}]
    },
    created: w3cDateTime(),
    title: {
      type: 'string',
      required: false
    },
    assetContent: url({required: false}),
    assetProvider: payswarmId(),
    listingRestrictions: {
      title: 'Listing Restrictions',
      description: 'Restrictions on the listing of this Asset for sale.',
      required: false,
      type: 'object',
      properties: {
        payee: payee({required: false}),
        payeeRule: payeeRule({required: false}),
        vendor: vendor({required: false}),
        validFrom: w3cDateTime({required: false}),
        validUntil: w3cDateTime({required: false})
      }
    },
    psaPublished: w3cDateTime({required: false})
  },
  additionalProperties: false
};

module.exports.getAssetsQuery = function() {
  return getAssetsQuery;
};
module.exports.postAssets = function() {
  return postAssets;
};
module.exports.postAsset = function() {
  return postAsset;
};
