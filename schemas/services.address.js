var address = require('./address');
var label = require('./label');
var validatedAddress = require('./validatedAddress');

var postAddressesQuery = {
  type: 'object',
  properties: {
    action: {
      required: false,
      type: 'string',
      enum: ['validate']
    }
  },
  additionalProperties: false
};

var postAddresses = {
  type: [address(), validatedAddress()]
};

var validateAddress = {
  type: [address(), validatedAddress()]
};

var delAddressesQuery = {
  type: 'object',
  properties: {
    addressId: {
      required: true,
      type: label()
    }
  },
  additionalProperties: false
};

module.exports.postAddressesQuery = function() {
  return postAddressesQuery;
};
module.exports.postAddresses = function() {
  return postAddresses;
};
module.exports.validateAddress = function() {
  return validateAddress;
};
module.exports.delAddressesQuery = function() {
  return delAddressesQuery;
};
