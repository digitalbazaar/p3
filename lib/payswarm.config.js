// setup the config variable
var config = {};
module.exports = config;

// app info
config.app = {};
config.app.masterTitle = 'payswarm1d';
config.app.workerTitle = 'payswarm1d-worker';
config.app.user = {};
// system group and user IDs (can be groupname/username instead of numbers)
config.app.user.groupId = 'payswarm';
config.app.user.userId = 'payswarm';

// config environment
config.environment = 'development';
//config.environment = 'testing';
//config.environment = 'sandbox';
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
config.loggers = {};

// transport for console logging
config.loggers.console = {};
config.loggers.console.level = 'debug';
config.loggers.console.silent = false;
config.loggers.console.json = false;
config.loggers.console.timestamp = true;
config.loggers.console.colorize = true;

// file transport for app logging
config.loggers.app = {};
config.loggers.app.level = 'debug';
config.loggers.app.silent = false;
config.loggers.app.json = false;
config.loggers.app.timestamp = true;
config.loggers.app.filename = '/tmp/payswarm-dev-app.log';
config.loggers.app.maxsize = 2*1024*1024;
config.loggers.app.maxFiles = 10;

// file transport for access logging
config.loggers.access = {};
config.loggers.access.level = 'debug';
config.loggers.access.silent = false;
config.loggers.access.json = false;
config.loggers.access.timestamp = true;
config.loggers.access.filename = '/tmp/payswarm-dev-access.log';
config.loggers.access.maxsize = 2*1024*1024;
config.loggers.access.maxFiles = 10;

// file transport for error logging
config.loggers.error = {};
config.loggers.error.level = 'error';
config.loggers.error.silent = false;
config.loggers.error.json = false;
config.loggers.error.timestamp = true;
config.loggers.error.filename = '/tmp/payswarm-dev-error.log';
config.loggers.error.maxsize = 2*1024*1024;
config.loggers.error.maxFiles = 10;

// transport for email logging
config.loggers.email = {};
config.loggers.email.level = 'critical';
config.loggers.email.to = ['cluster@payswarm.com'];
config.loggers.email.from = 'cluster@payswarm.com';
config.loggers.email.silent = true;
config.loggers.email.json = true;
config.loggers.email.timestamp = true;

// categories-transports map
config.loggers.categories = {
  app: ['console', 'app', 'error', 'email'],
  access: ['access', 'error']
};

// server info
config.server = {};
config.server.workers = 1;
// 0 means use # of cpus
//config.server.workers = 0;
config.server.port = 19443;
config.server.httpPort = 19100;
config.server.bindAddr = ['payswarm.dev'];
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
config.server.session.cookie.maxAge = 1000 * 60 * 30;

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
config.database.sessionCollection = 'session';

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
  profile: {}
};
config.profile.profiles = [];

// identity config
config.identity = {};
config.identity.defaults = {
  identity: {}
};
config.identity.identities = [];
config.identity.keys = [];

// address validator
config.addressValidator = {};
config.addressValidator.module = './payswarm.av.test';

// financial config
config.financial = {};
config.financial.defaults = {};
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
require('../configs/website');

// mail config
config.mail = {};
config.mail.events = [
/*
  TODO:
  'payswarm.common.Account.created'
  'payswarm.common.Deposit.charged'
  'payswarm.common.Deposit.charged-log'
  'payswarm.common.Profile.passcodeSent'
*/
  {
    type: 'payswarm.common.Deposit.failure',
    template: 'payswarm.common.Deposit.failure'
  },
  {
    type: 'payswarm.common.Deposit.success',
    // auth email
    template: 'payswarm.common.Deposit.success'
  },
  {
    type: 'payswarm.common.Deposit.success',
    // user email
    template: 'payswarm.common.Deposit.success-profile'
  },
  {
    type: 'payswarm.common.Profile.created',
    // auth email
    template: 'payswarm.common.Profile.created'
  },
  {
    type: 'payswarm.common.Profile.created',
    // user email
    template: 'payswarm.common.Profile.created-profile'
  }
];
config.mail.templates = {};
config.mail.templateMappers = ['../../email-templates/mapper'];
config.mail.connection = {
  host: 'smtp.digitalbazaar.com',
  ssl: true
};
config.mail.send = false;
config.mail.vars = {
  serviceDomain: 'payswarm.com',
  supportDomain: 'payswarm.com',
  subjectPrefix: 'DEV ',
  serviceName: 'PaySwarm Development',
  machine: require('os').hostname()
};
