var tools = require('../lib/payswarm-auth/payswarm.tools');

var jsonldType = require('./jsonldType');
var payee = require('./payee');
var payeeRule = require('./payeeRule');
var payswarmId = require('./payswarmId');
var graphSignature = require('./graphSignature');
var url = require('./url');
var dateTime = require('./dateTime');

var schema = {
  required: true,
  title: 'Listing',
  description: 'A Listing.',
  type: 'object',
  properties: {
    id: payswarmId(),
    // allow up to 4 additional custom types
    type: jsonldType('ps:Listing', 4),
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
    validFrom: dateTime(),
    validUntil: dateTime(),
    signature: graphSignature()
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
