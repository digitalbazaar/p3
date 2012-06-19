var tools = require('../lib/payswarm-auth/payswarm.tools');

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
    '@type': jsonldType('com:Transfer'),
    'ps:forTransaction': payswarmId(),
    'com:source': payswarmId(),
    'com:destination': payswarmId(),
    'com:amount': money.precisePositive(),
    'rdfs:comment': comment()
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
