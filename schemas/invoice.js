var tools = require(__libdir + '/payswarm-auth/tools');

var asset = require('./asset');
var comment = require('./comment');
var currency = require('./currency');
var jsonldType = require('./jsonldType');
var money = require('./money');
var payswarmId = require('./payswarmId');
var title = require('./title');

var invoiceItem = {
  required: true,
  title: 'Invoice Item',
  description: 'An item that is part of an Invoice.',
  type: 'object',
  properties: {
    type: jsonldType('InvoiceItem'),
    title: title(),
    // allow negative values for discounts, etc
    amount: money.precise(),
    currency: currency(),
    comment: comment({
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
      type: jsonldType('Invoice', 4),
      invoiceItem: {
        required: true,
        type: 'array',
        items: invoiceItem
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
