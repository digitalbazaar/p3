var tools = require(__libdir + '/payswarm-auth/tools');

var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payee = require('./payee');
var payeeRule = require('./payeeRule');
var payswarmId = require('./payswarmId');
var graphSignature = require('./graphSignature');
var url = require('./url');
var vendor = require('./vendor');
var w3cDateTime = require('./w3cDateTime');

var schema = {
  required: true,
  title: 'Listing',
  description: 'A Listing.',
  type: 'object',
  properties: {
    '@context': jsonldContext({type: 'object'}),
    id: payswarmId(),
    // allow up to 4 additional custom types
    type: jsonldType('Listing', 4),
    vendor: vendor(),
    payee: payee(),
    payeeRule: payeeRule({required: false}),
    asset: url(),
    assetHash: {
      required: true,
      type: 'string'
    },
    license: url(),
    licenseHash: {
      required: true,
      type: 'string'
    },
    validFrom: w3cDateTime(),
    validUntil: w3cDateTime(),
    signature: graphSignature()
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
