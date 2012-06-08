module.exports.logger = require('./payswarm-auth/payswarm.logger');

module.exports.loadModule = function(mod) {
  exports[mod] = require('./payswarm-auth/payswarm.' + mod);
  return exports[mod];
};
