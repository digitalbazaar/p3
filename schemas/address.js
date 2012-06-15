var tools = require('../lib/payswarm-auth/payswarm.tools');

var jsonldType = require('./jsonldType');
var label = require('./label');
var personName = require('./personName');

var schema = {
  required: true,
  title: 'Address',
  description: 'A vcard address.',
  type: 'object',
  properties: {
    '@type': jsonldType('vcard:Address'),
    'rdfs:label': label(),
    'vcard:fn': personName(),
    'vcard:street-address': {
      required: true,
      type: 'string',
      pattern: '^[^\\s](.*)[^\\s]$',
      minLength: 1,
      errors: {
        invalid: 'The street address must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a street address.'
      }
    },
    'vcard:locality': {
      required: true,
      type: 'string',
      pattern: '^[^\\s](.*)[^\\s]$',
      minLength: 1,
      errors: {
        invalid: 'The city/locality must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a city/locality.'
      }
    },
    'vcard:postal-code': {
      required: true,
      type: 'string',
      pattern: '^[^\\s](.*)[^\\s]$',
      minLength: 1,
      errors: {
        invalid: 'The zip/postal code must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a zip/postal code.'
      }
    },
    'vcard:region': {
      required: true,
      type: 'string',
      pattern: '^[^\\s](.*)[^\\s]$',
      minLength: 1,
      errors: {
        invalid: 'The state/region must not start or end with ' +
          'whitespace and must be at least 1 character in length.',
        missing: 'Please enter a state/region.'
      }
    },
    'vcard:country-name': {
      required: true,
      type: 'string',
      pattern: '^[^\\s](.*)[^\\s]$',
      minLength: 1,
      errors: {
        invalid: 'The country name must be exactly 2 characters in length.',
        missing: 'Please enter a country name.'
      }
    }
  }
};

module.exports = function(extend) {
  if(extend) {
    return tools.extend(tools.clone(schema), extend);
  }
  return schema;
};
