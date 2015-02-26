/*
 * PaySwarm Authority test configuration.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

module.exports = config;

// load common config
require('./common');

// location of configuration files
var _cfgdir = path.join(__dirname, '..');

// location of static resources
var _datadir = path.join(__dirname, '..');

// location of logs
var _logdir = '/tmp/payswarm-test';

// location of libs
var _libdir = path.join(__dirname, '..', 'lib');

// modules to load
config.modules = [
  //path.join(_libdir, 'payswarm-auth', 'monitors'),
  'database',
  'scheduler',
  'mail',
  'permission',
  'identity',
  path.join(_libdir, 'payswarm-auth', 'authority'),
  path.join(_libdir, 'payswarm-auth', 'identityAddress'),
  path.join(_libdir, 'payswarm-auth', 'identityPreferences'),
  path.join(_libdir, 'payswarm-auth', 'resource'),
  path.join(_libdir, 'payswarm-auth', 'financial'),
  path.join(_libdir, 'payswarm-auth', 'promo'),
  //path.join(_libdir, 'payswarm-auth', 'hosted.asset'),
  //path.join(_libdir, 'payswarm-auth', 'hosted.listing'),
  'website',
  'test',
  'services.docs',
  'services.filesystem',
  'services.identity',
  'services.identifier',
  'services.key',
  'services.session',
  'services.well-known',
  path.join(_libdir, 'payswarm-auth', 'services.account'),
  path.join(_libdir, 'payswarm-auth', 'services.address'),
  //path.join(_libdir, 'payswarm-auth', 'services.assetora'),
  path.join(_libdir, 'payswarm-auth', 'services.budget'),
  //path.join(_libdir, 'payswarm-auth', 'services.hosted.asset'),
  //path.join(_libdir, 'payswarm-auth', 'services.hosted.listing'),
  path.join(_libdir, 'payswarm-auth', 'services.identityPreferences'),
  path.join(_libdir, 'payswarm-auth', 'services.license'),
  path.join(_libdir, 'payswarm-auth', 'services.paymentToken'),
  path.join(_libdir, 'payswarm-auth', 'services.promo'),
  //path.join(_libdir, 'payswarm-auth', 'services.system'),
  //path.join(_libdir, 'payswarm-auth', 'services.test'),
  //path.join(_libdir, 'payswarm-auth', 'services.tools'),
  path.join(_libdir, 'payswarm-auth', 'services.transaction'),
  path.join(_libdir, 'payswarm-auth', 'services.vendor'),
  path.join(_libdir, 'payswarm-auth', 'services.well-known')
];

// config environment
config.environment = 'testing';

// core
config.core.workers = 0;
config.core.master.title = 'payswarm1d';
config.core.worker.title = 'payswarm1d-worker';
config.core.worker.restart = true;

// logging
config.loggers.logdir = _logdir;
config.loggers.app.filename = _logdir + '/payswarm-test-app.log';
config.loggers.access.filename = _logdir + '/payswarm-test-access.log';
config.loggers.error.filename = _logdir + '/payswarm-test-error.log';
config.loggers.email.silent = true;

// only log critical errors by default
config.loggers.console.level = 'critical';

// server info
config.server.port = 19444;
config.server.httpPort = 19081;
config.server.bindAddr = ['payswarm.dev'];
config.server.domain = 'payswarm.dev';
config.server.host = 'payswarm.dev:19444';
config.server.baseUri = 'https://' + config.server.host;
config.server.key = path.join(_cfgdir, 'pki', 'test-payswarm-auth.key');
config.server.cert = path.join(_cfgdir, 'pki', 'test-payswarm-auth.crt');
//config.server.ca = path.join(_cfgdir, 'pki', 'test-payswarm-auth-bundle.crt');

// session info
config.server.session.secret = '0123456789abcdef';
config.server.session.key = 'payswarm.sid';
config.server.session.prefix = 'payswarm.';

// limiter config
config.limiter.ipRequestsPerHour = 0;

// database config
config.database.name = 'payswarm_test';
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
config.database.writeOptions = {
  safe: true,
  j: true,
  // FIXME: change to 2 for at least 1 replica
  w: 1,
  multi: true
};
config.database.local.collection = 'payswarm_test';

// admin config
var baseUri = 'https://' + config.server.host;
var adminId = baseUri + '/i/admin';

config.admin = {};
config.admin.baseUri = baseUri;
config.admin.id = adminId;
config.admin.name = 'Admin';

// authority config
config.authority.baseUri = baseUri;
config.authority.id = baseUri + '/i/authority';
config.authority.name = 'PaySwarm Test Authority';

// mail config
config.mail.connection = {
  host: 'mail.digitalbazaar.com',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {
  productionMode: config.website.views.vars.productionMode,
  baseUri: config.authority.baseUri,
  subject: {
    prefix: '[PaySwarm TEST] ',
    identityPrefix: '[PaySwarm TEST] '
  },
  service: {
    name: 'PaySwarm Dev Test',
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
config.brand.name = 'PaySwarm Test';

// add static paths for website
config.website.i18nPaths = [
  path.join(_datadir, 'site', 'static')
];
config.server.static.push(path.join(_datadir, 'site', 'static'));

config.website.views.paths.push(path.join(_datadir, 'site', 'views'));
config.website.views.cache = false;

// turn off locale file updates
config.website.writeLocales = false;

config.website.views.vars.productionMode = false;
// 'minify' setting used in non-production mode
config.website.views.vars.minify = false;

config.website.views.vars.baseUri = baseUri;
config.website.views.vars.serviceHost = config.server.host;
config.website.views.vars.serviceDomain = config.server.domain;
config.website.views.vars.supportDomain = 'payswarm.dev';

config.website.views.vars.googleAnalytics.enabled = false;
config.website.views.vars.googleAnalytics.account = '';

//config.website.views.vars.style.brand.src = '/img/payswarm.png';
//config.website.views.vars.style.brand.alt = config.brand.name;
//config.website.views.vars.style.brand.height = '24';
//config.website.views.vars.style.brand.width = '182';

config.website.views.vars.title = config.brand.name;
config.website.views.vars.siteTitle = config.brand.name;

config.website.views.vars.debug = false;

// identity credentials config
config.identityCredentials.allowInsecureCallback = true;

var clientData = config.website.views.vars.clientData;
clientData.baseUri = config.server.baseUri;
clientData.siteTitle = config.brand.name;
clientData.productionMode = false;

// identity service
config.identity.owner = config.authority.id;

// address validator
config.addressValidator.module = './av.test';

// financial config
config.financial.defaults.paymentGateways = {
  CreditCard: 'Test',
  BankAccount: 'Test'
};

// permit initial account balances for testing (*ONLY* true in dev mode!)
config.financial.allowInitialBalance = true;

require('./dev-data');

// test setup
config.test = {};
config.test.backend = {};
config.test.backend.tests = [
  path.resolve(__dirname, '..', 'node_modules', 'bedrock', 'tests', 'backend'),
  path.resolve(__dirname, '..', 'tests', 'backend')
];
config.test.frontend = {};
config.test.frontend.configFile = path.resolve(
  __dirname, '..', 'protractor.conf.js');
