var tools = require('../lib/payswarm-auth/tools');

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

var unsignedDeposit = {
  required: true,
  title: 'Unsigned Deposit',
  description: 'A Deposit that has not been digitally-signed.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    type: jsonldType(['com:Transaction', 'com:Deposit']),
    payee: payee(),
    source: payswarmId()
  },
  additionalProperties: false
};

var signedDeposit = {
  required: true,
  title: 'Signed Deposit',
  description: 'A digitally-signed Deposit.',
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
};

var deposit = {
  required: true,
  title: 'Deposit',
  description: 'A Deposit.',
  type: [unsignedDeposit, signedDeposit]
};

module.exports = function(type, extend) {
  var schema = deposit;
  if(type === 'unsigned') {
    schema = unsignedDeposit;
  }
  else if(type === 'signed') {
    schema = signedDeposit;
  }

  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
