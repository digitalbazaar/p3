var tools = require(__libdir + '/payswarm-auth/tools');

var currency = require('./currency');
var graphSignature = require('./graphSignature');
var ipv4Address = require('./ipv4Address');
var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var payee = require('./payee');
var paymentToken = require('./paymentToken');
var payswarmId = require('./payswarmId');
var transfer = require('./transfer');
var w3cDateTime = require('./w3cDateTime');
var withdrawalAmount = require('./withdrawalAmount');

var unsignedWithdrawal = {
  required: true,
  title: 'Unsigned Withdrawal',
  description: 'A Withdrawal that has not been digitally-signed.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    type: jsonldType(['Transaction', 'Withdrawal']),
    payee: payee(),
    source: payswarmId(),
    destination: payswarmId()
  },
  additionalProperties: false
};

var signedWithdrawal = {
  required: true,
  title: 'Signed Withdrawal',
  description: 'A digitally-signed Withdrawal.',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    id: payswarmId(),
    type: jsonldType(['Transaction', 'Withdrawal']),
    payee: payee(),
    source: payswarmId(),
    destination: paymentToken(),
    transfer: {
      required: true,
      type: 'array',
      items: transfer()
    },
    created: w3cDateTime(),
    currency: currency(),
    amount: withdrawalAmount(),
    ipv4Address: ipv4Address(),
    signature: graphSignature()
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
  }
  else if(type === 'signed') {
    schema = signedWithdrawal;
  }

  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
