var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var postPromosQuery = {
  title: 'Post Promotions Query',
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
  title: 'Redeem Promotional Code',
  type: 'object',
  properties: {
    promoCode: {
      required: true,
      type: 'string'
    },
    account: schemas.url()
  },
  additionalProperties: false
};

module.exports.postPromosQuery = function() {
  return postPromosQuery;
};
module.exports.redeemCode = function() {
  return redeemCode;
};
