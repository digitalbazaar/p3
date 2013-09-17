var config = require(__libdir + '/payswarm-auth').config;

// profile config
config.profile.defaults = {
  profile: {
    psaStatus: 'active',
    psaRole: [config.authority.baseUri + '/roles/profile_registered']
  }
};
