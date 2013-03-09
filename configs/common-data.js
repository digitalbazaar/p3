var config = require(__libdir).config;

// profile config
config.profile.defaults = {
  profile: {
    psaStatus: 'active',
    psaRole: [
      config.authority.baseUri + '/roles/profile_registered',
      config.authority.baseUri + '/roles/identity_manager',
      config.authority.baseUri + '/roles/financial_manager']
  }
};
