var getDocsQuery = {
  type: 'object',
  properties: {
    topic: {
      required: false,
      type: 'string',
      minLength: 1
    }
  },
  additionalProperties: false
};

module.exports.getDocsQuery = function() {
  return getDocsQuery;
};
