var tools = require(__libdir + '/payswarm-auth/tools');

var jsonldContext = require('./jsonldContext');
var jsonldType = require('./jsonldType');
var label = require('./label');
var personName = require('./personName');

var schema = {
  required: true,
  title: 'Address',
  description: 'A vcard address.',
  type: 'object',
  properties: {
    '@context': {
      required: false,
      type: jsonldContext()
    },
    type: jsonldType('Address'),
    label: label(),
    fullName: personName(),
    streetAddress: {
      required: true,
      type: 'string',
      pattern: '^\\S$|^\\S.*\\S$',
      minLength: 1,
      errors: {
        invalid: 'The street address must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a street address.',
        mask: true
      }
    },
    locality: {
      required: true,
      type: 'string',
      pattern: '^\\S$|^\\S.*\\S$',
      minLength: 1,
      errors: {
        invalid: 'The city/locality must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a city/locality.'
      }
    },
    postalCode: {
      required: true,
      type: 'string',
      pattern: '^\\S$|^\\S.*\\S$',
      minLength: 1,
      errors: {
        invalid: 'The zip/postal code must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a zip/postal code.'
      }
    },
    region: {
      required: true,
      type: 'string',
      pattern: '^\\S$|^\\S.*\\S$',
      minLength: 1,
      errors: {
        invalid: 'The state/region must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a state/region.'
      }
    },
    countryName: {
      required: true,
      type: 'string',
      pattern: '^\\S$|^\\S.*\\S$',
      minLength: 1,
      errors: {
        invalid: 'The country name must be exactly 2 characters in length.',
        missing: 'Please enter a country name.'
      }
    }
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(true, tools.clone(schema), extend);
  }
  return schema;
};
