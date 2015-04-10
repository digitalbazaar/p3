var bedrock = require('bedrock');

var address = require('./address');

var schema = address({
  title: 'Regulatory Address',
  description: 'An address to identify applicable regulations.',
  properties: {
    addressLocality: {
      required: false
    }
  }
});
delete schema.properties.label;
delete schema.properties.name;
delete schema.properties.streetAddress;
delete schema.properties.postalCode;

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
