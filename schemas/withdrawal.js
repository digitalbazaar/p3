var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;

var currency = require('./currency');
var ipv4Address = require('./ipv4Address');
var payee = require('./payee');
var paymentToken = require('./paymentToken');
var transfer = require('./transfer');
var withdrawalAmount = require('./withdrawalAmount');

var unsignedWithdrawal = {
  required: true,
  title: 'Unsigned Withdrawal',
  description: 'A Withdrawal that has not been digitally-signed.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    type: schemas.jsonldType(['Transaction', 'Withdrawal']),
    payee: payee(),
    source: schemas.url(),
    destination: schemas.url()
  },
  additionalProperties: false
};

var signedWithdrawal = {
  required: true,
  title: 'Signed Withdrawal',
  description: 'A digitally-signed Withdrawal.',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.url(),
    type: schemas.jsonldType(['Transaction', 'Withdrawal']),
    payee: payee(),
    source: schemas.url(),
    destination: paymentToken(),
    transfer: {
      required: true,
      type: 'array',
      items: transfer()
    },
    created: schemas.w3cDateTime(),
    currency: currency(),
    amount: withdrawalAmount(),
    ipv4Address: ipv4Address(),
    signature: schemas.graphSignature()
  },
  additionalProperties: false
};

var withdrawal = {
  required: true,
  title: 'Withdrawal',
  description: 'A Withdrawal.',
  type: [unsignedWithdrawal, signedWithdrawal]
};

module.exports = function(type, extend) {
  var schema = withdrawal;
  if(type === 'unsigned') {
    schema = unsignedWithdrawal;
  } else if(type === 'signed') {
    schema = signedWithdrawal;
  }

  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
