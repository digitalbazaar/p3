var tools = require(__libdir + '/payswarm-auth/tools');

var schema = {
  required: true,
  title: 'Withdrawal Amount',
  description: 'An amount to be withdrawn.',
  type: 'string',
  pattern: '^([1-9]{1}[0-9]{0,2}(\\,[0-9]{3})*(\\.[0-9]{0,10})?|[1-9]{1}[0-9]{0,}(\\.[0-9]{0,10})?)$',
  errors: {
    invalid: 'The withdrawal amount is invalid.',
    missing: 'Please withdraw a minimum of USD $1.00.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
