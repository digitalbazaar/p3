var tools = require('../lib/payswarm-auth/tools');

var jsonldType = require('./jsonldType');
var transfer = require('./transfer');
var depositAmount = require('./depositAmount');
var w3cDateTime = require('./w3cDateTime');
var comment = require('./comment');

var schema = {
  required: true,
  title: 'Transaction',
  description: 'A financial Transaction.',
  type: 'object',
  properties: {
    type: jsonldType('com:Transaction'),
    created: w3cDateTime(),
    // FIXME: seems incorrect to use deposit amount here
    amount: depositAmount(),
    transfer: {
      type: 'array',
      items: transfer()
    }
  },
  additionalProperties: false
};

module.exports.schema = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
