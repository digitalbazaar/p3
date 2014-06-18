var bedrock = require('bedrock');
var schemas = bedrock.validation.schemas;
var tools = bedrock.tools;

var asset = require('./asset');
var currency = require('./currency');
var money = require('./money');

var invoiceItem = {
  required: true,
  title: 'Invoice Item',
  description: 'An item that is part of an Invoice.',
  type: 'object',
  properties: {
    type: schemas.jsonldType('InvoiceItem'),
    title: schemas.title(),
    // allow negative values for discounts, etc
    amount: money.precise(),
    currency: currency(),
    comment: schemas.comment({
      minLength: 0
    })
  },
  additionalProperties: false
};

var schema = {
  required: true,
  title: 'Invoice',
  description: 'An invoice asset.',
  type: asset({
    properties: {
      type: schemas.jsonldType('Invoice', 4),
      invoiceItem: {
        required: true,
        type: 'array',
        items: invoiceItem,
        minItems: 1
      }
    }
  }),
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
