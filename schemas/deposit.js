var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;
var tools = bedrock.tools;

var currency = require('./currency');
var depositAmount = require('./depositAmount');
var ipv4Address = require('./ipv4Address');
var payee = require('./payee');
var paymentToken = require('./paymentToken');
var transfer = require('./transfer');

var unsignedDeposit = {
  required: true,
  title: 'Unsigned Deposit',
  description: 'A Deposit that has not been digitally-signed.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: schemas.jsonldType(['Transaction', 'Deposit']),
    payee: payee(),
    source: schemas.url()
  },
  additionalProperties: false
};

var signedDeposit = {
  required: true,
  title: 'Signed Deposit',
  description: 'A digitally-signed Deposit.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    type: schemas.jsonldType(['Transaction', 'Deposit']),
    payee: payee(),
    source: paymentToken(),
    transfer: {
      required: true,
      type: 'array',
      items: transfer()
    },
    created: schemas.w3cDateTime(),
    currency: currency(),
    amount: depositAmount(),
    ipv4Address: ipv4Address(),
    signature: schemas.graphSignature()
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
