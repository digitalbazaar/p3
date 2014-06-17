/*
 * PaySwarm common configuration.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// load application constants
require('./constants');

// add routes
// - string: '/foo/bar' -> site/views/foo/bar.tpl
// - array: ['/foo', '/foo/index.tpl'] -> site/views/foo/index.tpl
config.website.views.routes.push(['/', 'index.tpl']);
config.website.views.routes.push('/about');
config.website.views.routes.push('/legal');
config.website.views.routes.push('/contact');
config.website.views.routes.push(['/help', 'help/index.tpl']);
config.website.views.routes.push('/help/pricing');
config.website.views.routes.push('/help/wordpress');

// payswarm-specific website vars
config.website.views.vars.licenses = {
  directories: ['../licenses']
};
config.website.views.vars.style.brand = {
  alt: config.brand.name,
  src: '/img/payswarm.png',
  height: '24',
  width: '182'
};
config.website.views.vars.clientData.payswarmDefaults = {
  allowDuplicatePurchases: true
};
// key generation config
config.website.views.vars.clientData.keygen = {
  bits: 2048
};

// website contact info
var contact = config.website.views.vars.contact;
contact.address = {
  label: 'Digital Bazaar, Inc.',
  address:
    '1700 Kraft Drive, Suite 2408\n' +
    'Blacksburg, Virginia 24060-6475\n' +
    'United States of America',
  htmlAddress:
    '1700 Kraft Drive, Suite 2408<br/>' +
    'Blacksburg, Virginia 24060-6475<br/>' +
    'United States of America'
};
//contact.blog = {
//  label: 'PaySwarm Blog',
//  url: 'http://blog.' + config.server.domain + '/'
//};
contact.email = {
  label: 'Customer Support',
  url: 'mailto:support@' + config.server.domain,
  email: 'support@' + config.server.domain
};
//contact.facebook = {
//  label: 'XXX',
//  url: 'https://www.facebook.com/pages/XXX/1234'
//};
//contact.github = {label: '...', url: ''};
//contact.googlePlus = {
//  label: '+TrueCred',
//  url: 'https://plus.google.com/1234'
//};
//contact.irc = {
//  label: '#XXX',
//  url: 'irc://irc.freenode.net/XXX'
//};
contact.twitter = {
  label: '@payswarm',
  url: 'https://twitter.com/payswarm'
};
//contact.youtube = {label: '...', url: ''};

// common bedrock config
require('bedrock/configs/roles');
require('bedrock/configs/common-data');

// payswarm roles
require('./roles');

// mail
config.mail.connection.host = 'mail.digitalbazaar.com';
config.mail.connection.ssl = false;
config.mail.templates.cache = false;
config.mail.send = false;
config.mail.vars = {};
var _email_templates_dir = path.join(__dirname, '..', 'email-templates');
config.mail.templates.mappers.push(path.join(_email_templates_dir, '/mapper'));
config.mail.templates.paths.push(_email_templates_dir);
config.mail.events.push({
  type: 'common.Deposit.failure',
  template: 'common.Deposit.failure'
});
config.mail.events.push({
  type: 'common.Deposit.gatewaySuccess',
  // auth email
  template: 'common.Deposit.success'
});
config.mail.events.push({
  type: 'common.Deposit.success',
  // auth email
  template: 'common.Deposit.success'
});
config.mail.events.push({
  type: 'common.Deposit.cc-merchant-account-log',
  // auth email
  template: 'common.Deposit.cc-merchant-account-log'
});
config.mail.events.push({
  type: 'common.Deposit.ach-merchant-account-log',
  // auth email
  template: 'common.Deposit.ach-merchant-account-log'
});
config.mail.events.push({
  type: 'common.Deposit.success',
  // user email
  template: 'common.Deposit.success-profile'
});
// TODO: 'common.FinancialAccount.created'
config.mail.events.push({
  type: 'common.FinancialAccount.unbackedCreditPayoffFailed',
  // auth email
  template: 'common.FinancialAccount.unbackedCreditPayoffFailed'
});
config.mail.events.push({
  type: 'common.FinancialAccount.unbackedCreditPayoffFailed',
  // user email
  template: 'common.FinancialAccount.unbackedCreditPayoffFailed-profile'
});
config.mail.events.push({
  type: 'common.Profile.created',
  // auth email
  template: 'common.Profile.created'
});
config.mail.events.push({
  type: 'common.Purchase.success',
  // auth email
  template: 'common.Purchase.success'
});
config.mail.events.push({
  type: 'common.Purchase.success',
  // user email
  template: 'common.Purchase.success-profile'
});
config.mail.events.push({
  type: 'common.Profile.created',
  // user email
  template: 'common.Profile.created-profile'
});
config.mail.events.push({
  type: 'common.Profile.passcodeSent',
  // user email
  template: 'common.Profile.passcodeSent'
});
config.mail.events.push({
  type: 'common.PaymentToken.bankAccountCreated',
  // auth email
  template: 'common.PaymentToken.bankAccountCreated'
});
config.mail.events.push({
  type: 'common.PaymentToken.bankAccountCreated',
  // user email
  template: 'common.PaymentToken.bankAccountCreated-profile'
});
config.mail.events.push({
  type: 'common.PaymentToken.unverified',
  // auth email
  template: 'common.PaymentToken.unverified'
});
config.mail.events.push({
  type: 'common.PaymentToken.unverified',
  // user email
  template: 'common.PaymentToken.unverified-profile'
});
config.mail.events.push({
  type: 'common.PaymentToken.unverifiedLimitReached',
  // auth email
  template: 'common.PaymentToken.unverifiedLimitReached'
});
config.mail.events.push({
  type: 'common.PaymentToken.verified',
  // user email
  template: 'common.PaymentToken.verified'
});
config.mail.events.push({
  type: 'common.PaymentToken.verifyBalanceTooLow',
  // auth email
  template: 'common.PaymentToken.verifyBalanceTooLow'
});
config.mail.events.push({
  type: 'common.PaymentToken.verifyFailed',
  // auth email
  template: 'common.PaymentToken.verifyFailed'
});
config.mail.events.push({
  type: 'common.Transaction.externalTransactionVoided',
  template: 'common.Transaction.externalTransactionVoided'
});
config.mail.events.push({
  type: 'common.Transaction.statusCheckError',
  template: 'common.Transaction.statusCheckError'
});
config.mail.events.push({
  type: 'common.Transaction.statusChecksExceeded',
  template: 'common.Transaction.statusChecksExceeded'
});
config.mail.events.push({
  type: 'common.Withdrawal.failure',
  template: 'common.Withdrawal.failure'
});
config.mail.events.push({
  type: 'common.Withdrawal.gatewaySuccess',
  // auth email
  template: 'common.Withdrawal.success'
});
config.mail.events.push({
  type: 'common.Withdrawal.success',
  // auth email
  template: 'common.Withdrawal.success'
});
config.mail.events.push({
  type: 'common.Withdrawal.successForVerify',
  // auth email
  template: 'common.Withdrawal.success'
});
config.mail.events.push({
  type: 'common.Withdrawal.ach-merchant-account-log',
  // auth email
  template: 'common.Withdrawal.ach-merchant-account-log'
});
config.mail.events.push({
  type: 'common.Withdrawal.success',
  // user email
  template: 'common.Withdrawal.success-profile'
});
config.mail.events.push({
  type: 'hosted.Listing.assetExpired',
  // user email
  template: 'hosted.Listing.assetExpired-profile'
});

// server/client shared libs
/*config.server.static.push({
  route: '/route/to/lib.js',
  path: path.join(
    __dirname, '..', 'lib', 'payswarm', 'lib.js'),
  file: true
});
*/

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
  //'hosted.asset',
  //'hosted.listing',
  'website'
];

// override module list for specific environments
config.envModules = {};
config.envModules.down = [
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
config.monitors.cube.enabled = false;
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
config.financial.deposit.limits.USD.minimum = '0.01';
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
// increment settleAfter by 5 minutes when txn that triggered is still pending
config.financial.transaction.triggerSettleAfterIncrement = 1000 * 60 * 5;
// increment settleAfter by 30 seconds when status check result is pending
config.financial.transaction.statusSettleAfterIncrement = 1000 * 30;
// maximum number of external status checks before giving up
config.financial.transaction.maxExternalStatusChecks = 10;
// increment settleAfter by 30 seconds when credit payoff has not occurred
config.financial.transaction.creditPayoffSettleAfterIncrement = 1000 * 30;
// credit payment due period (delta between start and when payment is due)
config.financial.transaction.creditPaymentDuePeriod = 1000 * 60 * 5;

config.financial.account = {worker: {}};
// 24 hour account worker expiration
/* Note: this is used to tell workers that they may assume a previous worker
  either crashed after this time period expires or that a worker found pending
  deposits that will pay off unbacked credit that should be settled by the time
  this period expires. Either way, once the period expires, it is safe for a
  worker to resume work on an account. It is preferred that this period is
  long enough to give sufficient time for deposits to settle to avoid
  performance degradation due to churn. */
config.financial.account.worker.expiration = 1000 * 60 * 5;//* 60 * 24;
// run account workers every minute
config.financial.account.worker.schedule = 1000 * 60;
// amount offered for free credit lines
config.financial.account.freeCreditLineAmount = '10.0000000000';

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
// shared bcrypt salt for unique payment token IDs
config.financial.sharedPaymentTokenSalt =
  '$2a$15$ipLBJZdlSTV8sk5/5If18e';

// promo config
config.promo = {};

// hosted config
config.hosted = {asset: {}, listing: {}};
// how long a signed asset/listing is valid for (will be resigned afterwards)
// 1 day
config.hosted.asset.purchaseValidityDuration = 1000*60*60*24;
config.hosted.listing.purchaseValidityDuration = 1000*60*60*24;

// branding config
config.brand = {};
config.brand.name = 'PaySwarm';

// website config
config.website = {};
config.website.i18nPaths = [
  __dirname + '/../site/static'
];
// add static paths for website
config.server.static.push(__dirname + '/../site/static');
config.server.static.push(__dirname + '/../site/static/en');
config.server.static.push({
  route: '/forge',
  path: __dirname + '/../node_modules/node-forge/js'
});
config.server.static.push({
  route: '/requirejs/require.js',
  path: __dirname + '/../node_modules/requirejs/require.js',
  file: true
});
config.server.static.push({
  route: '/underscore/underscore.js',
  path: __dirname + '/../node_modules/underscore/underscore.js',
  file: true
});

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

// authentication config
// see config.server.session for session config
config.website.authentication = {};
config.website.authentication.httpSignature = {};
config.website.authentication.httpSignature.enabled = true;


// FIXME: remove me (was in common-data.js)
// profile config
config.profile.defaults = {
  profile: {
    psaStatus: 'active',
    psaRole: [config.authority.baseUri + '/roles/profile_registered']
  }
};
