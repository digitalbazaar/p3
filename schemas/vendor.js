var payswarmId = require('./payswarmId');
var tools = require(__libdir + '/payswarm-auth/tools');

var schema = {
  required: true,
  title: 'Vendor',
  description: 'A vendor for a Listing or a permitted vendor for a particular Asset.',
  type: [
    payswarmId(),
    {
      type: 'array',
      uniqueItems: true,
      items: payswarmId(),
      errors: {
        invalid: 'The vendor is invalid.',
        missing: 'The vendor is missing.'
      }
    }
  ]
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
