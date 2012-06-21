var tools = require('../lib/payswarm-auth/payswarm.tools');

var jsonldType = require('./jsonldType');
var w3cDateTime = require('./w3cDateTime');
var payswarmId = require('./payswarmId');

var schema = {
  required: true,
  title: 'GraphSignature',
  description: 'A digital signature on a graph.',
  type: 'object',
  properties: {
    type: jsonldType('sec:GraphSignature2012'),
    creator: payswarmId(),
    created: w3cDateTime(),
    signatureValue: {
      required: true,
      type: 'string'
    }
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
