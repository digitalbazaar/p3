var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;
var tools = bedrock.tools;

var payee = require('./payee');
var payeeRule = require('./payeeRule');
var vendor = require('./vendor');

var schema = {
  required: true,
  title: 'Asset',
  description: 'An Asset.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    // allow up to 4 additional custom types
    type: schemas.jsonldType('Asset', 4),
    creator: {
      required: false,
      type: [schemas.url(), {type: 'object'}]
    },
    title: schemas.title({required: false}),
    assetContent: schemas.url({required: false}),
    assetProvider: schemas.url(),
    listingRestrictions: {
      required: false,
      title: 'Listing Restrictions',
      description: 'Restrictions on the listing of this Asset for sale.',
      type: 'object',
      properties: {
        payee: payee({required: false}),
        payeeRule: payeeRule({required: false}),
        vendor: vendor({required: false}),
        validFrom: schemas.w3cDateTime({required: false}),
        validUntil: schemas.w3cDateTime({required: false})
      }
    },
    signature: schemas.graphSignature()
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
