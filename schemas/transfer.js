var tools = require(__libdir + '/payswarm-auth/tools');

var currency = require('./currency');
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
    type: jsonldType('Transfer'),
    source: payswarmId(),
    destination: payswarmId(),
    amount: money.precisePositive(),
    currency: currency(),
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
