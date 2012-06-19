var tools = require('../lib/payswarm-auth/payswarm.tools');

var schema = {
  required: true,
  title: 'Deposit Amount',
  description: 'An amount to be deposited.',
  type: 'string',
  pattern: '^([1-9]{1}[0-9]{0,2}(\\,[0-9]{3})*(\\.[0-9]{0,2})?|[1-9]{1}[0-9]{0,}(\\.[0-9]{0,2})?)$',
  errors: {
    invalid: 'The deposit amount is invalid.',
    missing: 'Please deposit a minimum of USD $1.00.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
