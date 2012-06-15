var tools = require('../lib/payswarm-auth/payswarm.tools');

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
    '@type': jsonldType('com:Transaction'),
    'com:date': w3cDateTime(),
    // FIXME: seems incorrect to use deposit amount here
    'com:amount': depositAmount(),
    'com:transfer': {
      type: 'array',
      items: transfer()
    }
  }
};

module.exports.schema = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
