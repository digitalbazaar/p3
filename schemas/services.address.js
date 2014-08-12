var bedrock = require('bedrock');
var schemas = bedrock.module('validation').schemas;

var address = require('./address');
var validatedAddress = require('./validatedAddress');

var postAddress = {
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(),
    id: schemas.identifier(),
    label: schemas.label({required: false})
  },
  additionalProperties: false
};

var postAddressesQuery = {
  type: 'object',
  properties: {
    action: {
      required: false,
      type: 'string',
      enum: ['validate']
    }
  },
  additionalProperties: true
};

var postAddresses = {
  type: [address(), validatedAddress()]
};

var validateAddress = {
  type: [address(), validatedAddress()]
};

module.exports.postAddress = function() {
  return postAddress;
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
