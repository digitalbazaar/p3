var payswarmId = require('./payswarmId');

var getAssetsQuery = {
  type: 'object',
  properties: {
    keywords: {
      required: false,
      type: 'string'
    },
    createdStart: {
      required: false,
      type: 'string'
      // FIXME w3cDateTime or int or other date format
    },
    createdEnd: {
      required: false,
      type: 'string'
      // FIXME w3cDateTime or int or other date format
    },
    previous: {
      required: false,
      type: payswarmId()
    },
    limit: {
      required: false,
      // query param will be a string but content is an integer from 1 to 30.
      type: 'string',
      pattern: '^([1-9]|[12][0-9]|30)$'
    }
  },
  additionalProperties: true
};

module.exports.getAssetsQuery = function() {
  return getAssetsQuery;
};
