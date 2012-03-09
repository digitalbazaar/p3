var config = {};
module.exports = config;

// server info
config.http = {};
config.http.port = 8000;
config.https = {};
config.https.port = 8001;

// modules to load
config.modules = [
  './payswarm.database',
  './payswarm.profile',
  './payswarm.addressValidator',
  './payswarm.identity',
  './payswarm.financial',
  './payswarm.test'
];

// database config
config.database = {};
config.database.name = 'test';
config.database.host = 'localhost';
config.database.port = 27017;
config.database.options = {
};
config.database.connectOptions = {
  auto_reconnect: true
};
config.database.readOptions = {
  safe: true
};
config.database.writeOptions = {
  safe: true,
  fsync: true,
  multi: true
};

// authority config
config.authority = {};
config.authority.baseUri = 'https://payswarm.dev:19443';
config.authority.id = config.authority.baseUri + '/i/authority';

// permission config
config.permission = {};
config.permission.roles = [];

// profile config
config.profile = {};
config.profile.defaults = {
  profile: {
    'psa:status': 'active',
    'psa:role': [config.authority.baseUri + '/roles/profile_registered']
  }
};
config.profile.profiles = [];

// identity config
config.identity = {};
config.identity.defaults = {
  identity: {
    '@type': 'ps:PersonalIdentity',
    'vcard:adr': [],
    'ps:preferences': {
      '@type': 'ps:Preferences'
    }
  }
};
config.identity.identities = [];
config.identity.keys = [];

// address validator
config.addressValidator.module = './payswarm.av.test';

// financial config
config.financial = {};
config.financial.defaults = {
  account: {
    '@type': 'Account',
    // demo with $10
    'com:balance': '10.0000000',
    'com:escrow': '0.0000000',
    'com:currency': 'USD',
    'psa:status': 'active',
    'psa:privacy': 'private'
  },
  paymentTokens: [{
    // demo payment token source
    '@type': 'ccard:CreditCard',
    'rdfs:label': 'My Visa',
    'com:gateway': 'Test',
    'ccard:brand': 'ccard:Visa',
    'ccard:number': '4111111111111111',
    'ccard:expMonth': '11',
    'ccard:expYear': '16',
    'ccard:cvm': '111',
    'ccard:address': {
      'vcard:fn': 'Billing Name',
      'vcard:street-address': '1 Billing Lane',
      'vcard:locality': 'Locality',
      'vcard:region': 'Region',
      'vcard:postal-code': '12345',
      'vcard:country-name': 'US'
    }
  }]
};
config.financial.accounts = [];
config.financial.paymentGateways = [
  './payswarm.pg.test'
];