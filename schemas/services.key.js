var label = require('./label');
var status = require('./status');
var publicKeyPem = require('./publicKeyPem');

var postKey = {
  type: 'object',
  properties: {
    label: label(),
    psaStatus: status()
  }
};

var postKeys = {
  type: 'object',
  properties: {
    label: label(),
    publicKeyPem: publicKeyPem()
  }
};

module.exports.postKey = function() {
  return postKey;
};
module.exports.postKeys = function() {
  return postKeys;
};
