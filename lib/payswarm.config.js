// setup the config variable
var config = {};
module.exports = config;

// config environment
config.environment = 'development';
//config.environment = 'testing';
//config.environment = 'production';

// modules to load
config.modules = [
  'mail',
  'database',
  'permission',
  'profile',
  'identity',
  'resource',
  'financial',
  'website'/*,
  'test'*/
];

// logger config
config.logger = {};

// console logging
config.logger.console = {};
config.logger.console.level = 'debug';
config.logger.console.silent = false;
config.logger.console.json = false;
config.logger.console.timestamp = true;
config.logger.console.colorize = true;

// generic file logging
config.logger.file = {};
config.logger.file.level = 'debug';
config.logger.file.silent = false;
config.logger.file.json = false;
config.logger.file.timestamp = true;
config.logger.file.filename = '/tmp/payswarm-dev.log';
config.logger.file.maxsize = 2*1024*1024;
config.logger.file.maxFiles = 10;

// error file logging
/*
config.logger.error = {};
config.logger.error.level = 'error';
config.logger.error.silent = false;
config.logger.error.json = false;
config.logger.error.timestamp = true;
config.logger.error.filename = '/tmp/payswarm-dev.error';*/

// email logging
config.logger.email = {};
config.logger.email.level = 'critical';
config.logger.email.to = ['cluster@payswarm.com'];
config.logger.email.from = 'cluster@payswarm.com';
config.logger.email.silent = true;
config.logger.email.json = true;
config.logger.email.timestamp = true;

// server info
config.server = {};
config.server.workers = 1;
// FIXME: fix bug with sqlite (each worker needs its own db for
// distributed IDs... probably need to use a different strategy)
//config.server.workers = require('os').cpus().length;
config.server.port = 19443;
config.server.httpPort = 19100;
config.server.domain = 'payswarm.dev';
config.server.host = config.server.domain;
if(config.server.port !== 443) {
  config.server.host += ':' + config.server.port;
}
config.server.key = __dirname + '/../pki/test-payswarm-auth.key';
config.server.cert = __dirname + '/../pki/test-payswarm-auth.crt';

// session info
config.server.session = {};
config.server.session.secret = '0123456789abcdef';
config.server.session.key = 'payswarm.sid';
config.server.session.prefix = 'payswarm.';
config.server.session.cookie = {};
//config.server.session.cookie.secure = true;
// 30 minute timeout
config.server.session.cookie.maxAge = 1000*60*30;

// server cache
config.server.cache = {};
config.server.cache.maxAge = 0;

// server static resource config
config.server.static = [__dirname + '/../site/static'];
config.server.staticOptions = {
  maxAge: config.server.cache.maxAge
};

// database config
config.database = {};
config.database.name = 'payswarm_dev';
config.database.host = 'localhost';
config.database.port = 27017;
config.database.options = {};
config.database.connectOptions = {
  auto_reconnect: true
};
config.database.writeOptions = {
  safe: true,
  fsync: true,
  multi: true
};
config.database.local = {};
config.database.local.path = '/tmp/payswarm-dev.local.db';

// authority config
config.authority = {};
config.authority.baseUri = 'https://' + config.server.host;
config.authority.id = config.authority.baseUri + '/i/authority';
config.authority.name = 'PaySwarm Authority';

// permission config
config.permission = {};
config.permission.roles = [];

// profile config
config.profile = {};
config.profile.defaults = {
  profile: {
    'psa:status': 'active',
    'psa:role': [
      config.authority.baseUri + '/roles/profile_registered',
      config.authority.baseUri + '/roles/identity_manager',
      config.authority.baseUri + '/roles/financial_manager']
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
config.addressValidator = {};
config.addressValidator.module = './payswarm.av.test';

// financial config
config.financial = {};
config.financial.defaults = {
  account: {},
  paymentTokens: [],
  gateway: 'Test'
};
config.financial.accounts = [];
config.financial.payeeSchemes = {};
config.financial.paymentGateways = [];
// 15 minute deposit expiration time
config.financial.depositExpiration = 1000 * 60 * 15;
// 24 hour cached contract expiration time in seconds
config.financial.cachedContractExpiration = 60 * 60 * 24;
// 1 hour transaction worker expiration
config.financial.transactionWorkerExpiration = 1000 * 60 * 60;
// maximum number of automatic clean ups
config.financial.transactionWorkerMaxCleanups = 3;
// run transaction workers every hour
config.financial.transactionWorkerSchedule = 1000 * 60 * 60;

// website config
config.website = {};

// views config
config.website.views = {};
config.website.views.path = [__dirname + '/../site/views'];
config.website.views.options = {};
config.website.views.options.layout = false;
config.website.views.vars = {};

// mail config
config.mail = {};
config.mail.events = {};
config.mail.templates = {};
config.mail.templateMappers = ['../../email-templates/mapper'];
config.mail.connection = {
  host: 'smtp.digitalbazaar.com',
  ssl: true
};
config.mail.send = false;

// external configs
require('../configs/roles');
require('../configs/website');
require('../configs/dev');
