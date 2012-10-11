var tools = require('../lib/payswarm-auth/tools');

var jsonldType = require('./jsonldType');
var payswarmId = require('./payswarmId');
var money = require('./money');
var comment = require('./comment');

var schema = {
  required: true,
  title: 'Transfer',
  description: 'A financial Transfer.',
  type: 'object',
  properties: {
    type: jsonldType('com:Transfer'),
    source: payswarmId(),
    destination: payswarmId(),
    amount: money.precisePositive(),
    comment: comment()
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
