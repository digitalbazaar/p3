var bedrock = require('bedrock');

var schema = {
  required: true,
  title: 'Refresh interval',
  description: 'The interval on which a budget refills to its original amount.',
  type: 'string',
  pattern: '^([2-9][0-9]{3}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])T([0-1][0-9]|2[0-3]):([0-5][0-9]):(([0-5][0-9])|60)(\\.[0-9]+)?(Z|((\\+|-)([0-1][0-9]|2[0-3]):([0-5][0-9])))?)|(R(\\d+)?\\/[2-9][0-9]{3}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])T([0-1][0-9]|2[0-3]):([0-5][0-9]):(([0-5][0-9])|60)(\\.[0-9]+)?(Z|((\\+|-)([0-1][0-9]|2[0-3]):([0-5][0-9])))?\\/P((\\d+Y)?(\\d+M)?(\\d+W)?(\\d+D)?)?(T(\\d+H)?(\\d+M)?(\\d+S)?)?)$',
  errors: {
    invalid: 'Please enter a valid refresh interval.',
    missing: 'Please enter a refresh interval.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
