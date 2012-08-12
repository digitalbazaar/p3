var tools = require('../lib/payswarm-auth/tools');

var jsonldType = require('./jsonldType');
var w3cDateTime = require('./w3cDateTime');
var payswarmId = require('./payswarmId');

var schema = {
  required: true,
  title: 'GraphSignature',
  description: 'A digital signature on a graph.',
  type: 'object',
  properties: {
    id: payswarmId({required: false}),
    type: jsonldType('sec:GraphSignature2012'),
    creator: payswarmId(),
    created: w3cDateTime(),
    signatureValue: {
      title: 'Digital Signature Value',
      description: 'A base-64 encoded byte string containing the result of the GraphSignature2012 algorithm.',
      required: true,
      type: 'string'
    }
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
