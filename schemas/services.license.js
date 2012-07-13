var payswarmId = require('./payswarmId');

var cacheLicense = {
  type: 'object',
  properties: {
    license: payswarmId(),
    licenseHash: {
      required: false,
      type: 'string'
    }
  },
  additionalProperties: false
};

module.exports.cacheLicense = function() {
  return cacheLicense;
};
