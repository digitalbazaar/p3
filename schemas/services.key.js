var label = require('./label');
var status = require('./status');
var publicKeyPem = require('./publicKeyPem');

var postKey = {
  type: 'object',
  properties: {
    'rdfs:label': label(),
    'psa:status': status()
  }
};

var postKeys = {
  type: 'object',
  properties: {
    'rdfs:label': label(),
    'sec:publicKeyPem': publicKeyPem()
  }
};

module.exports.postKey = function() {
  return postKey;
};
module.exports.postKeys = function() {
  return postKeys;
};
