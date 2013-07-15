var label = require('./label');
var publicKeyPem = require('./publicKeyPem');
var jsonldContext = require('./jsonldContext');

var postKey = {
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    revoked: {
      type: 'string'
    }
  },
  additionalProperties: false
};

var postKeys = {
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    label: label(),
    publicKeyPem: publicKeyPem()
  },
  additionalProperties: false
};

module.exports.postKey = function() {
  return postKey;
};
module.exports.postKeys = function() {
  return postKeys;
};
