var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;
var tools = bedrock.tools;

var payee = require('./payee');
var payeeRule = require('./payeeRule');
var vendor = require('./vendor');

var schema = {
  required: true,
  title: 'Asset',
  description: 'PaySwarm Asset.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    // allow up to 4 additional custom types
    type: schemas.jsonldType('Asset', 4),
    creator: {
      required: false,
      type: [schemas.url(), {type: 'object'}]
    },
    created: schemas.w3cDateTime(),
    title: schemas.title({required: false}),
    assetContent: schemas.url({required: false}),
    assetProvider: schemas.url(),
    listingRestrictions: {
      title: 'Listing Restrictions',
      description: 'Restrictions on the listing of this Asset for sale.',
      required: false,
      type: 'object',
      properties: {
        payee: payee({required: false}),
        payeeRule: payeeRule({required: false}),
        vendor: vendor({required: false}),
        validFrom: schemas.w3cDateTime({required: false}),
        validUntil: schemas.w3cDateTime({required: false})
      }
    },
    // FIXME: is sysPublished desirable?
    sysPublished: schemas.w3cDateTime({required: false})//,
    // Meritora custom asset properties
    // FIXME: need semantic type-based validation
    // FIXME: this is currently a hack to allow these to pass through
    //
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
