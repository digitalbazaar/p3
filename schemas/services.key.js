var label = require('./label');
var status = require('./status');
var publicKeyPem = require('./publicKeyPem');

var postKey = {
  type: 'object',
  properties: {
    label: label(),
    psaStatus: status()
  },
  additionalProperties: false
};

var postKeys = {
  type: 'object',
  properties: {
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
