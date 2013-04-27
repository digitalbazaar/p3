var jsonldContext = require('./jsonldContext');
var label = require('./label');
var payswarmId = require('./payswarmId');
var publicKeyPem = require('./publicKeyPem');

var postKey = {
  type: 'object',
  properties: {
    '@context': jsonldContext(),
    id: payswarmId(),
    label: label({required: false}),
    revoked: {
      required: false,
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
