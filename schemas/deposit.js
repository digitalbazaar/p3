var tools = require('../lib/payswarm-auth/payswarm.tools');

var jsonldType = require('./jsonldType');
var payee = require('./payee');
var paymentToken = require('./paymentToken');
var transfer = require('./transfer');
var graphSignature = require('./graphSignature');
var depositAmount = require('./depositAmount');
var w3cDateTime = require('./w3cDateTime');

var schema = {
  required: true,
  title: 'Deposit',
  description: 'A Deposit.',
  type: [{
    type: 'object',
    properties: {
      type: jsonldType(['com:Transaction', 'com:Deposit']),
      payee: payee(),
      source: paymentToken()
    }
  }, {
    type: 'object',
    properties: {
      type: jsonldType(['com:Transaction', 'com:Deposit']),
      payee: payee(),
      transfer: {
        required: true,
        type: 'array',
        items: transfer()
      },
      created: w3cDateTime(),
      amount: depositAmount(),
      signature: graphSignature()
    }
  }]
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
