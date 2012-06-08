exports.logger = require('./payswarm-auth/payswarm.logger');

exports.loadModule = function(mod)
{
   exports[mod] = require('./payswarm-auth/payswarm.' + mod);
   return exports[mod];
}

