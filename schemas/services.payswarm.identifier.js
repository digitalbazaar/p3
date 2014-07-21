var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;

var postFinancialAccountIdentifier = {
  type: 'object',
  properties: {
    owner: schemas.url(),
    sysSlug: schemas.slug()
  },
  additionalProperties: false
};

module.exports.postFinancialAccountIdentifier = function() {
  return postFinancialAccountIdentifier;
};
