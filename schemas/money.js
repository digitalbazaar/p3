var tools = require('../lib/payswarm-auth/payswarm.tools');

var precise = {
  required: true,
  title: 'Precise money',
  description: 'A monetary amount that is precise.',
  type: 'string',
  pattern: '^([\\-]?[1-9]{1}[0-9]{0,}(\\.[0-9]{0,7})?|[\\-]?0\\.[0-9]{0,7}|[\\-]?\\.[0-9]{1,7})$',
  errors: {
    invalid: 'The monetary amount must be in the following format: ' +
      '"x.xx". Example: 10.00',
    missing: 'Please enter a monetary amount.'
  }
};

var precisePositive = {
  required: true,
  title: 'Precise positive money',
  description: 'A monetary amount that is precise and greater than zero.',
  type: 'string',
  pattern: '^([1-9]{1}[0-9]{0,}(\\.[0-9]{0,7})?|0\\.[0-9]{1,7}|\\.[0-9]{1,7})$',
  errors: {
    invalid: 'The monetary amount must be greater than 0.00.',
    missing: 'Please enter a monetary amount greater than 0.'
  }
};

module.exports.precise = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(precise), extend);
  }
  return precise;
};
module.exports.precisePositive = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(precisePositive), extend);
  }
  return precisePositive;
};
