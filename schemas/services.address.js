var address = require('./address');
var validatedAddress = require('./validatedAddress');

var postAddresses = {
  type: [address, validatedAddress]
};

var validateAddress = {
  type: [address, validatedAddress]
};

module.exports.postAddresses = function() {
  return postAddresses;
};
module.exports.validateAddress = function() {
  return validateAddress;
};
