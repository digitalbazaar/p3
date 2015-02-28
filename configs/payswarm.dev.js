/*
 * PaySwarm development configuration.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// load common config
require('./common');

// location of static resources
var _datadir = path.join(__dirname, '..');

// location of logs
var _logdir = '/tmp';

// core
config.core.workers = 1;
config.core.master.title = 'payswarm1d';
config.core.worker.title = 'payswarm1d-worker';
config.core.worker.restart = false;

// monitor config
config.monitors = {};

// transport for event logging
config.monitors.cube = {};
config.monitors.cube.enabled = false;
config.monitors.cube.protocol = 'udp';
config.monitors.cube.host = 'localhost';
config.monitors.cube.port = 1180;
config.monitors.cube.debug = true;

// logging
config.loggers.app.filename = path.join(_logdir, 'payswarm-dev-app.log');
config.loggers.access.filename = path.join(_logdir, 'payswarm-dev-access.log');
config.loggers.error.filename = path.join(_logdir, 'payswarm-dev-error.log');
config.loggers.email.silent = true;
config.loggers.email.to = ['cluster@payswarm.com'];
config.loggers.email.from = 'cluster@payswarm.com';

// server info
config.server.port = 19443;
config.server.httpPort = 19080;
config.server.bindAddr = ['payswarm.dev'];
config.server.domain = 'payswarm.dev';
config.server.host = config.server.domain;
if(config.server.port !== 443) {
  config.server.host += ':' + config.server.port;
}
config.server.baseUri = 'https://' + config.server.host;
config.server.key = path.join(
  __dirname, '..', 'pki', 'test-payswarm-auth.key');
config.server.cert = path.join(
  __dirname, '..', 'pki', 'test-payswarm-auth.crt');
//config.server.ca = path.join(
//  __dirname, '..', 'pki', 'test-payswarm-auth-bundle.crt');

// session info
config.express.session.secret = '0123456789abcdef';
config.express.session.key = 'payswarm.sid';
config.express.session.prefix = 'payswarm.';

// limiter config
config.limiter.ipRequestsPerHour = 0;

// database config
config.mongodb.name = 'payswarm_dev';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.username = 'payswarm';
config.mongodb.password = 'password';
config.mongodb.adminPrompt = true;
config.mongodb.local.collection = 'payswarm_dev';

// base config
var baseUri = 'https://' + config.server.host;

// admin config
config.admin.baseUri = baseUri;
config.admin.id = baseUri + '/i/admin';
config.admin.name = 'Admin';

// authority config
config.authority.baseUri = baseUri;
config.authority.id = baseUri + '/i/authority';
config.authority.name = 'PaySwarm Dev Authority';

// mail config
config.mail.connection = {
  host: 'mail.digitalbazaar.com',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {
  productionMode: config.views.vars.productionMode,
  baseUri: config.authority.baseUri,
  subject: {
    prefix: '[PaySwarm DEV] ',
    identityPrefix: '[PaySwarm DEV] '
  },
  service: {
    name: 'PaySwarm Development',
    domain: config.server.domain,
    host: config.server.host
  },
  system: {
    name: 'System',
    email: 'cluster@' + config.server.domain
  },
  support: {
    name: 'Customer Support',
    email: 'support@' + config.server.domain
  },
  registration: {
    email: 'registration@' + config.server.domain
  },
  comments: {
    email: 'comments@' + config.server.domain
  },
  notify: {
    email: 'notify@' + config.server.domain
  },
  contracts: {
    email: 'contracts@' + config.server.domain
  },
  deposits: {
    email: 'deposits@' + config.server.domain
  },
  withdrawals: {
    email: 'withdrawals@' + config.server.domain
  },
  machine: require('os').hostname()
};

// branding
config.brand.name = 'PaySwarm Development';

// add static paths for website
// FIXME: old style had array, new style just one dir, also not used yet
//config.i18n.localePath = [
//  path.join(_datadir, 'site', 'static')
//];
config.express.static.push(path.join(_datadir, 'site', 'static'));

config.views.paths.push(path.join(_datadir, 'site', 'views'));
config.views.cache = false;

// turn off locale file updates
config.i18n.writeLocales = false;

config.views.vars.productionMode = false;
// 'minify' setting used in non-production mode
config.views.vars.minify = false;

config.views.vars.baseUri = baseUri;
config.views.vars.serviceHost = config.server.host;
config.views.vars.serviceDomain = config.server.domain;
config.views.vars.supportDomain = 'payswarm.dev';

config.views.vars.googleAnalytics.enabled = false;
config.views.vars.googleAnalytics.account = '';

//config.views.vars.style.brand.src = '/img/payswarm.png';
//config.views.vars.style.brand.alt = config.brand.name;
//config.views.vars.style.brand.height = '24';
//config.views.vars.style.brand.width = '182';

config.views.vars.title = config.brand.name;
config.views.vars.siteTitle = config.brand.name;

config.views.vars.debug = true;

// REST API documentation - variables
config.docs.vars.brand = config.brand.name;
config.docs.vars.baseUri = config.server.baseUri;

// identity credentials config
config.identityCredentials.allowInsecureCallback = true;

var vars = config.views.vars;
vars.baseUri = config.server.baseUri;
vars.siteTitle = config.brand.name;
vars.productionMode = false;
vars.demoWarningUrl = 'https://payswarm.com/wiki/Demo_Warning';

// identity service
config.identity.owner = config.authority.id;

// address validator
// FIXME: does this path need fixing?
config.addressValidator.module = './av.test';

// financial config
config.financial.defaults.paymentGateways = {
  CreditCard: 'Test',
  BankAccount: 'Test'
};

// permit initial account balances for testing (*ONLY* true in dev mode!)
config.financial.allowInitialBalance = true;
