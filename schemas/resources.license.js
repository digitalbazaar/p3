var tools = require(__libdir + '/payswarm-auth/tools');

var jsonldType = require('./jsonldType');
var payswarmId = require('./payswarmId');

var schema = {
  required: true,
  title: 'License',
  description: 'A License.',
  type: 'object',
  properties: {
    id: payswarmId(),
    type: jsonldType('License'),
    licenseTemplate: {
      required: true,
      type: 'string'
    }
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
