var tools = require(__libdir + '/payswarm-auth/tools');

var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payee = require('./payee');
var payeeRule = require('./payeeRule');
var payswarmId = require('./payswarmId');
var title = require('./title');
var url = require('./url');
var vendor = require('./vendor');
var w3cDateTime = require('./w3cDateTime');

var schema = {
  required: true,
  title: 'Asset',
  description: 'PaySwarm Asset.',
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
    title: title({required: false}),
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
    // FIXME: is psaPublished desirable?
    psaPublished: w3cDateTime({required: false}),
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
