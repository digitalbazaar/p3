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
// - string: '/foo/bar' -> site/views/foo/bar.html
// - array: ['/foo', '/foo/index.html'] -> site/views/foo/index.html
config.website.views.routes.push(['/', 'index.html']);
config.website.views.routes.push('/about');
config.website.views.routes.push('/legal');
config.website.views.routes.push('/contact');
config.website.views.routes.push(['/help', 'help/index.html']);
config.website.views.routes.push('/help/pricing');
config.website.views.routes.push('/help/wordpress');

// add static paths for website
var node_modules = path.join(__dirname, '..', 'node_modules');
config.server.static.push({
  route: '/forge',
  path: path.join(node_modules, 'node-forge', 'js')
});
config.server.static.push({
  route: '/requirejs/require.js',
  path: path.join(node_modules, 'requirejs', 'require.js'),
  file: true
});
config.server.static.push({
  route: '/underscore/underscore.js',
  path: path.join(node_modules, 'underscore', 'underscore.js'),
  file: true
});
config.server.static.push({
  route: '/filesaver/FileSaver.js',
  path: path.join(node_modules, 'filesaver.js', 'FileSaver.js'),
  file: true
});
config.server.static.push({
  route: '/d3/d3.js',
  path: path.join(node_modules, 'd3', 'd3.js'),
  file: true
});

// the supported non-english languages for the site
config.website.locales = ['es', 'zh', 'ru', 'ja', 'de', 'fr'];
config.website.localePath = path.join(__dirname, '..', 'locales');
config.website.writeLocales = true;

// authentication config
// see config.server.session for session config
config.website.authentication = {};
config.website.authentication.httpSignature = {};
config.website.authentication.httpSignature.enabled = true;

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

// database config
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
config.database.local.collection = 'payswarm_dev';
config.database.local.writeOptions = {
  safe: true,
  j: true,
  multi: true
};

// admin config
var baseUri = 'https://' + config.server.host;
var adminId = baseUri + '/i/admin';

config.admin = {};
config.admin.baseUri = baseUri;
config.admin.id = adminId;
config.admin.name = 'Admin';

// authority config
config.authority = {};
config.authority.id = config.authority.baseUri + '/i/authority';
config.authority.name = 'PaySwarm Authority';

// mail
config.mail.connection = {
  host: 'mail.digitalbazaar.com',
  ssl: false
};
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

// address validator
config.addressValidator = {};
// FIXME: does this path need fixing?
config.addressValidator.module = './av.test';

// financial config
config.financial = {};
config.financial.defaults = {
  account: {},
  paymentTokens: [],
  paymentGateways: {}
};
config.financial.accounts = [];
config.financial.paymentTokens = [];
config.financial.payeeSchemes = {};
config.financial.paymentGateways = [];
// named gateway details
config.financial.paymentGateway = {};
// permit initial account balances for testing (*ONLY* true in dev mode!)
config.financial.allowInitialBalance = false;

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

// add payswarm schemas
config.validation.schema.paths.push(path.join(__dirname, '..', 'schemas'));

// common bedrock config
require('bedrock/configs/roles');
require('bedrock/configs/common-data');

// payswarm roles
require('./roles');

// FIXME: port below to bedrock
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
// FIXME: port above to bedrock

// FIXME: remove me (was in common-data.js)
// profile config
config.profile.defaults = {
  profile: {
    psaStatus: 'active',
    psaRole: [config.authority.baseUri + '/roles/profile_registered']
  }
};
