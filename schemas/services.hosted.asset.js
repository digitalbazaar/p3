var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var asset = require('./asset');

var getAssetsQuery = {
  title: 'GET Hosted Asset Query',
  type: 'object',
  properties: {
    type: {
      required: false,
      type: 'string'
    },
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
    assetContent: schemas.url({required: false})
  },
  additionalProperties: true
};

var postAssets = {
  title: 'Create Asset',
  description: 'Contains all of the details required to create a new Asset.',
  type: [asset({
    // service does a more strict check based on extra asset types
    // FIXME: library doesn't handle 'true'
    additionalProperties: undefined
  })],
  //additionalProperties: true
};

var postAsset = {
  title: 'Edit Asset',
  description: 'Contains all of the details required to edit an Asset.',
  type: asset(),
  // service does a more strict check based on extra asset types
  additionalProperties: true
};

var postAssetPublicKey = {
  title: 'Set Asset Public Key',
  description: 'Sets the Public Key for an Asset and any with content in ' +
    'the same directory.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    publicKeyPem: schemas.publicKeyPem()
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
module.exports.postAssetPublicKey = function() {
  return postAssetPublicKey;
};
