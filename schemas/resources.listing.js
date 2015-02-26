var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;
var tools = bedrock.tools;

var payee = require('./payee');
var payeeRule = require('./payeeRule');
var vendor = require('./vendor');

var schema = {
  required: true,
  title: 'Listing',
  description: 'A Listing.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    // allow up to 4 additional custom types
    type: schemas.jsonldType('Listing', 4),
    vendor: vendor(),
    payee: payee(),
    payeeRule: payeeRule({required: false}),
    asset: schemas.url(),
    assetHash: {
      required: true,
      type: 'string'
    },
    license: schemas.url(),
    licenseHash: {
      required: true,
      type: 'string'
    },
    validFrom: schemas.w3cDateTime(),
    validUntil: schemas.w3cDateTime(),
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
