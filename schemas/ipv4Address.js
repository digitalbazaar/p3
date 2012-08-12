var tools = require('../lib/payswarm-auth/tools');

var schema = {
  required: true,
  title: 'IPv4 Address',
  description: 'A numeric IPv4 address in dot-notation.',
  type: 'string',
  pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
  errors: {
    invalid: 'The IPv4 address must be of the in numeric dot-notation, for example: "nnn.nnn.nnn.nnn".',
    missing: 'The IPv4 address of the requesting client is missing.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
