var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var address = require('./address');
var currency = require('./currency');
var regulatoryAddress = require('./regulatoryAddress');
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
  additionalProperties: true
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
      type: schemas.label()
    }
  },
  additionalProperties: true
};

var postRegulatoryAddress = {
  type: 'object',
  properties: {
    address: regulatoryAddress(),
    account: {
      required: false,
      type: 'object',
      properties: {
        '@context': schemas.jsonldContext(),
        sysSlug: schemas.slug(),
        label: {
          required: true,
          type: schemas.label()
        },
        sysPublic: {
          required: false,
          type: schemas.propertyVisibility()
        },
        currency: currency()
      },
      additionalProperties: false
    }
  }
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
module.exports.postRegulatoryAddress = function() {
  return postRegulatoryAddress;
};
