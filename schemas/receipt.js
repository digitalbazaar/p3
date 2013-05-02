var tools = require(__libdir + '/payswarm-auth/tools');

var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var graphSignature = require('./graphSignature');
var payswarmId = require('./payswarmId');

var schema = {
  required: true,
  title: 'Receipt',
  description: 'A financial Receipt.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    type: jsonldType('Receipt'),
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
        asset: payswarmId(),
        license: payswarmId(),
        listing: payswarmId(),
        assetProvider: payswarmId(),
        assetAcquirer: payswarmId(),
        vendor: payswarmId()
      },
      additionalProperties: false
    },
    signature: graphSignature()
  },
  additionalProperties: false
};

module.exports.schema = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
