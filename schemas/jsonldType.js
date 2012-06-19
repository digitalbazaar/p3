module.exports = function(types) {
  var schema = {
    title: 'JSON-LD type',
    description: 'A set of JSON-LD types.'
  };

  types = Array.isArray(types) ? types : [types];

  // create array option for multiple types
  var arr;
  if(types.length > 1) {
    arr = schema;
  }
  else {
    arr = {};
  }
  arr.required = true;
  arr.type = 'array';
  arr.minItems = types.length;
  arr.uniqueItems = true;
  arr.items = {
    type: 'string',
    enum: types
  };
  arr.errors = {
    invalid: 'The JSON-LD type information is invalid.',
    missing: 'The JSON-LD type information is missing.'
  };

  // add single type option
  if(arr !== schema) {
    schema.type = [{
      type: 'string',
      enum: types,
      errors: {
        invalid: 'The JSON-LD type information is invalid.',
        missing: 'The JSON-LD type information is missing.'
      }
    }, arr];
  }
};
