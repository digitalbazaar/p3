var tools = require(__libdir + '/payswarm-auth/tools');

var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payswarmId = require('./payswarmId');
var payee = require('./payee');
var payeeRule = require('./payeeRule');
var graphSignature = require('./graphSignature');
var url = require('./url');
var vendor = require('./vendor');
var w3cDateTime = require('./w3cDateTime');

var schema = {
  required: true,
  title: 'Asset',
  description: 'An Asset.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    id: payswarmId(),
    // allow up to 4 additional custom types
    type: jsonldType('Asset', 4),
    creator: {
      required: false,
      type: [url(), {type: 'object'}]
    },
    title: {
      type: 'string',
      required: false
    },
    assetContent: url({required: false}),
    assetProvider: payswarmId(),
    listingRestrictions: {
      required: false,
      title: 'Listing Restrictions',
      description: 'Restrictions on the listing of this Asset for sale.',
      type: 'object',
      properties: {
        payee: payee({required: false}),
        payeeRule: payeeRule({required: false}),
        vendor: vendor({required: false}),
        validFrom: w3cDateTime({required: false}),
        validUntil: w3cDateTime({required: false})
      }
    },
    signature: graphSignature()
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
