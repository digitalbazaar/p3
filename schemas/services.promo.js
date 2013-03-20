var payswarmId = require('./payswarmId');

var postPromosQuery = {
  type: 'object',
  properties: {
    action: {
      required: false,
      type: 'string',
      enum: ['redeem']
    }
  },
  additionalProperties: false
};

var redeemCode = {
  type: 'object',
  properties: {
    promoCode: {
      required: true,
      type: 'string',
    },
    account: payswarmId()
  },
  additionalProperties: false
};

module.exports.postPromosQuery = function() {
  return postPromosQuery;
};
module.exports.redeemCode = function() {
  return redeemCode;
};
