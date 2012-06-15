var config = require('../lib/payswarm-auth').config;

// profile config
config.profile.defaults = {
  profile: {
    'psa:status': 'active',
    'psa:role': [
      config.authority.baseUri + '/roles/profile_registered',
      config.authority.baseUri + '/roles/identity_manager',
      config.authority.baseUri + '/roles/financial_manager']
  }
};

// identity config
config.identity.defaults = {
  identity: {
    '@type': 'ps:PersonalIdentity',
    'vcard:adr': [],
    'ps:preferences': {
      '@type': 'ps:Preferences'
    }
  }
};

// financial config
config.financial.defaults = {
  account: {},
  paymentTokens: [],
  gateway: 'Test'
};
