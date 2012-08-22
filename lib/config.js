// setup the config variable
var config = {};
module.exports = config;

// app info
config.app = {};
config.app.masterTitle = 'payswarm1d';
config.app.workerTitle = 'payswarm1d-worker';
config.app.restartWorkers = true;
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
config.server.session.cookie.secure = true;
// NOTE: 'connect' doesn't update the expires age for the cookie on every
//   request so sessions will always timeout on the client after the maxAge
//   time. Setting to null will cause sessions checks to only happen on the
//   server which does update the expires time on every request. The server
//   session maxAge is set below.
config.server.session.cookie.maxAge = null;

// server cache
config.server.cache = {};
config.server.cache.maxAge = 0;

// server static resource config
config.server.static = [];
config.server.staticOptions = {
  maxAge: config.server.cache.maxAge
};

// limiter config
config.limiter = {};
// limit number of requests per hour per IP address (0 means no limit)
config.limiter.ipRequestsPerHour = 0;

// database config
config.database = {};
config.database.name = 'payswarm_dev';
config.database.host = 'localhost';
config.database.port = 27017;
config.database.username = 'payswarm';
config.database.password = 'password';
config.database.adminPrompt = true;
config.database.options = {};
config.database.connectOptions = {
  auto_reconnect: true,
  socketOptions: {
    maxBsonSize: 1024 * 1024 * 16
  }
};
config.database.writeOptions = {
  safe: true,
  j: true,
  // FIXME: change to 2 for at least 1 replica
  w: 1,
  multi: true
};
config.database.session = {
  collection: 'session',
  // time in seconds to run db update to clear expired sessions
  clearInterval: 60 * 60,
  // 30 minute timeout on the server
  maxAge: 1000 * 60
};

// local database config
config.database.local = {};
config.database.local.name = 'local';
config.database.local.collection = 'payswarm_dev';
config.database.local.writeOptions = {
  safe: true,
  j: true,
  multi: true
};

// authority config
config.authority = {};
config.authority.baseUri = 'https://' + config.server.host;
config.authority.id = config.authority.baseUri + '/i/authority';
config.authority.profile = config.authority.baseUri + '/profiles/authority';
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
// identity config
config.identity.defaults = {
  identity: {
    type: 'ps:PersonalIdentity',
    psaPublic: [],
    address: [],
    preferences: {
      type: 'ps:Preferences'
    }
  }
};
config.identity.identities = [];
config.identity.keys = [];

// address validator
config.addressValidator = {};
config.addressValidator.module = './av.test';

// financial config
config.financial = {};
config.financial.defaults = {};
config.financial.accounts = [];
config.financial.paymentTokens = [];
config.financial.payeeSchemes = {};
config.financial.paymentGateways = [];
// permit initial account balances for testing (*ONLY* true in dev mode!)
config.financial.allowInitialBalance = true;

// deposit config
config.financial.deposit = {};
// 15 minute deposit expiration time (must be resigned after this)
config.financial.deposit.expiration = 1000 * 60 * 15;

// cached contract config
config.financial.cachedContract = {};
// 30 minute cached contract expiration time in seconds
config.financial.cachedContract.expiration = 60 * 30;

// transaction config
config.financial.transaction = {worker: {}};
// 24 hour transaction worker expiration (assume worker has crashed after this)
config.financial.transaction.worker.expiration = 1000 * 60 * 60 * 24;
// run transaction workers every minute
config.financial.transaction.worker.schedule = 1000 * 60;
// increment settleAfter by 24 hours when status check result is pending
config.financial.transaction.statusSettleAfterIncrement = 1000 * 60 * 60 * 24;
// maximum number of status checks (these cost money!)
config.financial.transaction.maxStatusChecks = 2;

// website config
config.website = {};
config.website.statCachePaths = [
  __dirname + '/../site/static'
];
// add static paths for website
config.server.static.push(__dirname + '/../site/static');
config.server.static.push(__dirname + '/../site/static/en');

// the supported non-english languages for the site
config.website.locales = ['es', 'zh', 'ru', 'ja', 'de', 'fr'];
config.website.localePath = __dirname + '/../locales';
config.website.writeLocales = true;

// views config
config.website.views = {};
config.website.views.vars = {};
config.website.views.enableCache = false;
config.website.views.paths = [
  __dirname + '/../site/views'
];
require('../configs/website');

// mail config
config.mail = {};
config.mail.events = [
/*
  TODO:
  'common.Account.created'
  'common.Profile.passcodeSent'
*/
  {
    type: 'common.Deposit.failure',
    template: 'common.Deposit.failure'
  },
  {
    type: 'common.Deposit.success',
    // auth email
    template: 'common.Deposit.success'
  },
  {
    type: 'common.Deposit.cc-merchant-account-log',
    // auth email
    template: 'common.Deposit.cc-merchant-account-log'
  },
  {
    type: 'common.Deposit.ach-merchant-account-log',
    // auth email
    template: 'common.Deposit.ach-merchant-account-log'
  },
  {
    type: 'common.Deposit.success',
    // user email
    template: 'common.Deposit.success-profile'
  },
  {
    type: 'common.Profile.created',
    // auth email
    template: 'common.Profile.created'
  },
  {
    type: 'common.Purchase.success',
    // auth email
    template: 'common.Purchase.success'
  },
  {
    type: 'common.Purchase.success',
    // user email
    template: 'common.Purchase.success-profile'
  },
  {
    type: 'common.Profile.created',
    // user email
    template: 'common.Profile.created-profile'
  },
  {
    type: 'common.Profile.passcodeSent',
    // user email
    template: 'common.Profile.passcodeSent'
  }
];
config.mail.templates = {};
config.mail.templates.enableCache = false;
config.mail.templates.path = __dirname + '/../../email-templates';
config.mail.templates.mappers = ['../../email-templates/mapper'];
config.mail.connection = {
  host: 'mail.digitalbazaar.com',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {
  serviceHost: config.server.host,
  serviceDomain: config.server.domain,
  supportDomain: config.server.domain,
  subjectPrefix: 'DEV ',
  serviceName: 'PaySwarm Development',
  machine: require('os').hostname()
};
