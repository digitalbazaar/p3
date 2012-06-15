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
      '@type': jsonldType(['com:Transaction', 'com:Deposit']),
      'com:payee': payee(),
      'com:source': paymentToken()
    }
  }, {
    type: 'object',
    properties: {
      '@type': jsonldType(['com:Transaction', 'com:Deposit']),
      'com:payee': payee(),
      'com:transfer': {
        required: true,
        type: 'array',
        items: transfer()
      },
      'com:date': w3cDateTime(),
      'com:amount': depositAmount(),
      'sec:signature': graphSignature()
    }
  }]
};

module.exports.schema = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
