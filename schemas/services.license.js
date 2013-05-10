var payswarmId = require('./payswarmId');
var jsonldContext = require('./jsonldContext');
var graphSignature = require('./graphSignature');

var cacheLicense = {
  title: 'Cache License',
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    license: payswarmId(),
    licenseHash: {
      required: false,
      type: 'string'
    },
    signature: graphSignature({required: false})
  },
  additionalProperties: false
};

module.exports.cacheLicense = function() {
  return cacheLicense;
};
