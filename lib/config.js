// setup the config variable
var config = {};
module.exports = config;

// app info
config.app = {};
config.app.masterTitle = 'payswarm1d';
config.app.workerTitle = 'payswarm1d-worker';
config.app.restartWorkers = false;
config.app.user = {};
// system group and user IDs (can be groupname/username instead of numbers)
config.app.user.groupId = 'payswarm';
config.app.user.userId = 'payswarm';

// config environment
//config.environment = 'down';
config.environment = 'development';
//config.environment = 'testing';
//config.environment = 'sandbox';
//config.environment = 'production';

// modules to load
config.modules = [
  'monitors',
  'mail',
  'database',
  'permission',
  'profile',
  'identity',
  'resource',
  'financial',
  'promo',
  'website'
];

// override module list for specific environments
config.envModules = {};
config.envModules['down'] = [
  'website'
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

// monitor config
config.monitors = {};

// transport for event logging
config.monitors.cube = {};
config.monitors.cube.enabled = true;
config.monitors.cube.protocol = 'udp';
config.monitors.cube.host = 'localhost';
config.monitors.cube.port = 1180;
config.monitors.cube.debug = true;

// server info
config.server = {};
config.server.workers = 1;
// 0 means use # of cpus
//config.server.workers = 0;
config.server.port = 19443;
config.server.httpPort = 19080;
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
// redis config
config.limiter.host = 'localhost';
config.limiter.port = 6379;
config.limiter.options = {};
config.limiter.password = '';
// limit number of requests per hour per IP address (0 means no limit)
config.limiter.ipRequestsPerHour = 0;

// database config
config.database = {};
// mongodb config
config.database.name = 'payswarm_dev';
config.database.host = 'localhost';
config.database.port = 27017;
config.database.username = 'payswarm';
config.database.password = 'password';
config.database.adminPrompt = true;
config.database.options = {
  safe: true,
  j: true,
  native_parser: true
};
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
  maxAge: 1000 * 60 * 30
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
  personal: {
    type: 'PersonalIdentity',
    psaPublic: [],
    address: [],
    preferences: {
      type: 'IdentityPreferences'
    }
  },
  vendor: {
    type: 'VendorIdentity',
    psaPublic: ['label', 'website', 'description'],
    address: [],
    preferences: {
      type: 'IdentityPreferences'
    }
  }
};
config.identity.defaults.identity = config.identity.defaults.personal;
config.identity.identities = [];
config.identity.keys = [];

// address validator
config.addressValidator = {};
config.addressValidator.module = './av.test';

// financial config
config.financial = {};
config.financial.defaults = {
  paymentGateways: {}
};
config.financial.accounts = [];
config.financial.paymentTokens = [];
config.financial.payeeSchemes = {};
config.financial.paymentGateways = [];
// named gateway details
config.financial.paymentGateway = {};
// permit initial account balances for testing (*ONLY* true in dev mode!)
config.financial.allowInitialBalance = true;

// deposit config
config.financial.deposit = {};
// 15 minute deposit expiration time (must be resigned after this)
config.financial.deposit.expiration = 1000 * 60 * 15;
// limits
config.financial.deposit.limits = {};
config.financial.deposit.limits.USD = {};
config.financial.deposit.limits.USD.minimum = '1.00';
config.financial.deposit.limits.USD.maximum = '1000.00';

// withdrawal config
config.financial.withdrawal = {};
// 15 minute withdrawal expiration time (must be resigned after this)
config.financial.withdrawal.expiration = 1000 * 60 * 15;
// limits
config.financial.withdrawal.limits = {};
config.financial.withdrawal.limits.USD = {};
config.financial.withdrawal.limits.USD.minimum = '1.00';
config.financial.withdrawal.limits.USD.maximum = '100.00';

// budget config
config.financial.budget = {};
// limits
config.financial.budget.limits = {};
config.financial.budget.limits.USD = {};
config.financial.budget.limits.USD.minimum = '0.00';
config.financial.budget.limits.USD.minimumExclusive = true;
config.financial.budget.limits.USD.maximum = '1000000.00';

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
// increment settleAfter by 30 seconds when status check result is pending
config.financial.transaction.statusSettleAfterIncrement = 1000 * 30;
// maximum number of external status checks before giving up
config.financial.transaction.maxExternalStatusChecks = 10;

config.financial.paymentToken = {worker: {}};
// run payment token workers every minute
config.financial.paymentToken.worker.schedule = 1000 * 60;
// consider an unverified payment token idle after 1 minute (needs attention)
config.financial.paymentToken.worker.tokenIdleTimeout = 1000 * 60;
// send a notification if an unverified payment token idle after 30 minutes
config.financial.paymentToken.worker.tokenNotifyIdleTimeout =
  1000 * 60 * 30;
// maximum number of concurrent unverified payment tokens
config.financial.paymentToken.maxUnverified = 1000;
// maximum number of globally unverified payment tokens
config.financial.paymentToken.maxUnverifiedPerIdentity = 2;
// maximum number of attempts to verify a payment token
config.financial.paymentToken.maxVerifyAttempts = 5;
// number of payment token verify amounts
config.financial.paymentToken.verifyAmounts = 2;
// minimum payment token verify amount (USD)
config.financial.paymentToken.minVerifyAmount = 0.01;
// maximum payment token verify amount (USD)
config.financial.paymentToken.maxVerifyAmount = 0.50;
// expiration times after deletion, in seconds
config.financial.paymentToken.expiration = {
  BankAccount: 1000 * 60,
  CreditCard: 0
};
// do not create default payment tokens
config.financial.createDefaultPaymentTokens = false;

// promo config
config.promo = {};

// branding config
config.brand = {};
config.brand.name = 'PaySwarm';

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
  // TODO: 'common.Account.created'
  {
    type: 'common.Deposit.failure',
    template: 'common.Deposit.failure'
  },
  {
    type: 'common.Deposit.gatewaySuccess',
    // auth email
    template: 'common.Deposit.success'
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
  },
  {
    type: 'common.PaymentToken.bankAccountCreated',
    // auth email
    template: 'common.PaymentToken.bankAccountCreated'
  },
  {
    type: 'common.PaymentToken.bankAccountCreated',
    // user email
    template: 'common.PaymentToken.bankAccountCreated-profile'
  },
  {
    type: 'common.PaymentToken.unverified',
    // auth email
    template: 'common.PaymentToken.unverified'
  },
  {
    type: 'common.PaymentToken.unverified',
    // user email
    template: 'common.PaymentToken.unverified-profile'
  },
  {
    type: 'common.PaymentToken.unverifiedLimitReached',
    // auth email
    template: 'common.PaymentToken.unverifiedLimitReached'
  },
  {
    type: 'common.PaymentToken.verified',
    // user email
    template: 'common.PaymentToken.verified'
  },
  {
    type: 'common.PaymentToken.verifyBalanceTooLow',
    // auth email
    template: 'common.PaymentToken.verifyBalanceTooLow'
  },
  {
    type: 'common.PaymentToken.verifyFailed',
    // auth email
    template: 'common.PaymentToken.verifyFailed'
  },
  {
    type: 'common.Transaction.statusCheckError',
    template: 'common.Transaction.statusCheckError'
  },
  {
    type: 'common.Transaction.statusChecksExceeded',
    template: 'common.Transaction.statusChecksExceeded'
  },
  {
    type: 'common.Withdrawal.failure',
    template: 'common.Withdrawal.failure'
  },
  {
    type: 'common.Withdrawal.gatewaySuccess',
    // auth email
    template: 'common.Withdrawal.success'
  },
  {
    type: 'common.Withdrawal.success',
    // auth email
    template: 'common.Withdrawal.success'
  },
  {
    type: 'common.Withdrawal.successForVerify',
    // auth email
    template: 'common.Withdrawal.success'
  },
  {
    type: 'common.Withdrawal.ach-merchant-account-log',
    // auth email
    template: 'common.Withdrawal.ach-merchant-account-log'
  },
  {
    type: 'common.Withdrawal.success',
    // user email
    template: 'common.Withdrawal.success-profile'
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
config.mail.vars = {};
