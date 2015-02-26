var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;
var tools = bedrock.tools;

var schema = {
  required: true,
  title: 'Receipt',
  description: 'A financial Receipt.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: schemas.jsonldType('Receipt'),
    preferences: {
      required: false,
      title: 'Purchase Preferences',
      type: 'array',
      items: {
        type: 'string',
        enum: ['PreAuthorization']
      }
    },
    contract: {
      required: true,
      title: 'Contract in Receipt',
      description: 'The short-form Contract that appears in a Receipt.',
      type: 'object',
      properties: {
        type: schemas.jsonldType(['Transaction', 'Contract']),
        id: schemas.url(),
        asset: {
          required: true,
          type: [schemas.url(), {
            required: true,
            type: 'object',
            properties: {
              id: schemas.url(),
              type: schemas.jsonldType('Asset'),
              assetContent: schemas.url()
            },
            additionalProperties: false
          }]
        },
        license: schemas.url(),
        listing: schemas.url(),
        assetProvider: schemas.url(),
        assetAcquirer: schemas.url(),
        vendor: schemas.url()
      },
      additionalProperties: false
    },
    signature: schemas.graphSignature()
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
