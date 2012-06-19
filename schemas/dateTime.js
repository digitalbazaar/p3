var tools = require('../lib/payswarm-auth/payswarm.tools');

var schema = {
  required: true,
  title: 'Date/Time',
  description: 'A date and time combination.',
  type: 'string',
  pattern: '^[2-9][0-9]{3}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1]) ([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$',
  errors: {
    invalid: 'The date/time must be of the format "YYYY-MM-DD HH:MM:SS".',
    missing: 'Please enter a date/time.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
