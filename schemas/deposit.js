var tools = require('../lib/payswarm-auth/payswarm.tools');

var payswarmId = require('./payswarmId');
var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payee = require('./payee');
var paymentToken = require('./paymentToken');
var transfer = require('./transfer');
var graphSignature = require('./graphSignature');
var depositAmount = require('./depositAmount');
var w3cDateTime = require('./w3cDateTime');
var ipv4Address = require('./ipv4Address');

var schema = {
  required: true,
  title: 'Deposit',
  description: 'A Deposit.',
  type: [{
    type: 'object',
    properties: {
      '@context': jsonldContext(),
      type: jsonldType(['com:Transaction', 'com:Deposit']),
      payee: payee(),
      source: paymentToken()
    },
    additionalProperties: false
  }, {
    type: 'object',
    properties: {
      '@context': jsonldContext(),
      id: payswarmId(),
      type: jsonldType(['com:Transaction', 'com:Deposit']),
      payee: payee(),
      source: paymentToken(),
      transfer: {
        required: true,
        type: 'array',
        items: transfer()
      },
      created: w3cDateTime(),
      amount: depositAmount(),
      ipv4Address: ipv4Address(),
      signature: graphSignature()
    },
    additionalProperties: false
  }]
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
