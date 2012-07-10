var tools = require('../lib/payswarm-auth/payswarm.tools');

var jsonldType = require('./jsonldType');
var payswarmId = require('./payswarmId');
var graphSignature = require('./graphSignature');
var url = require('./url');

var schema = {
  required: true,
  title: 'Asset',
  description: 'An Asset.',
  type: 'object',
  properties: {
    id: payswarmId(),
    // allow up to 4 additional custom types
    type: jsonldType('ps:Asset', 4),
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
    signature: graphSignature()
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
