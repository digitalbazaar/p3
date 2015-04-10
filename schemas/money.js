var bedrock = require('bedrock');

var precise = {
  required: true,
  title: 'Precise money',
  description: 'A monetary amount that is precise.',
  type: 'string',
  pattern: '^([\\-]?[1-9]{1}[0-9]{0,}(\\.[0-9]{0,10})?|[\\-]?0\\.[0-9]{0,10}|[\\-]?\\.[0-9]{1,10}|0)$',
  errors: {
    invalid: 'The monetary amount must be in the following format: ' +
      '"x.xx". Example: 10.00',
    missing: 'Please enter a monetary amount.'
  }
};

var preciseNonNegative = {
  required: true,
  title: 'Precise money',
  description: 'A monetary amount that is precise and greater than or equal to zero.',
  type: 'string',
  pattern: '^(0|[1-9]{1}[0-9]{0,}(\\.[0-9]{0,10})?|0\\.[0-9]{0,10}|\\.[0-9]{1,10})$',
  errors: {
    invalid: 'The monetary amount must be equal to or greater than 0.00.',
    missing: 'Please enter a monetary amount.'
  }
};

var precisePositive = {
  required: true,
  title: 'Precise positive money',
  description: 'A monetary amount that is precise and greater than zero.',
  type: 'string',
  pattern: '^([1-9]{1}[0-9]{0,}(\\.[0-9]{0,10})?|0\\.[0-9]{1,10}|\\.[0-9]{1,10})$',
  disallow: {
    type: 'string',
    pattern: '^(0|(0)?\\.([0]{1,10})?)$'
  },
  errors: {
    invalid: 'The monetary amount must be greater than 0.00.',
    missing: 'Please enter a monetary amount greater than 0.'
  }
};

module.exports.precise = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(precise), extend);
  }
  return precise;
};
module.exports.preciseNonNegative = function(extend) {
  if(extend) {
    return bedrock.util.extend(
      true, bedrock.util.clone(preciseNonNegative), extend);
  }
  return preciseNonNegative;
};
module.exports.precisePositive = function(extend) {
  if(extend) {
    return bedrock.util.extend(
      true, bedrock.util.clone(precisePositive), extend);
  }
  return precisePositive;
};
