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
var _datadir = path.join(__dirname, '/..');

// location of logs
var _logdir = '/tmp';

// location of libs
var _libdir = path.join(__dirname, '..', 'lib');

// modules to load
config.modules = [
  //path.join(_libdir, 'payswarm-auth', 'monitors'),
  'database',
  //'scheduler',
  //'mail',
  //'permission',
  //'identity',
  //path.join(_libdir, 'payswarm-auth', 'authority'),
  //path.join(_libdir, 'payswarm-auth', 'identityAddress'),
  //path.join(_libdir, 'payswarm-auth', 'identityPreferences'),
  //path.join(_libdir, 'payswarm-auth', 'resource'),
  //path.join(_libdir, 'payswarm-auth', 'financial'),
  //path.join(_libdir, 'payswarm-auth', 'promo'),
  //path.join(_libdir, 'payswarm-auth', 'hosted.asset'),
  //path.join(_libdir, 'payswarm-auth', 'hosted.listing'),
  //'website'
];

// website services to load
config.website.services = [
  'docs',
  'identity',
  'identifier',
  'key',
  'session',
  'well-known',
  path.join(_libdir, 'payswarm-auth', 'services.account'),
  path.join(_libdir, 'payswarm-auth', 'services.address'),
  //path.join(_libdir, 'payswarm-auth', 'services.assetora'),
  path.join(_libdir, 'payswarm-auth', 'services.budget'),
  //path.join(_libdir, 'payswarm-auth', 'services.hosted.asset'),
  //path.join(_libdir, 'payswarm-auth', 'services.hosted.listing'),
  path.join(_libdir, 'payswarm-auth', 'services.identityPreferences'),
  path.join(_libdir, 'payswarm-auth', 'services.license'),
  path.join(_libdir, 'payswarm-auth', 'services.paymentToken'),
  path.join(_libdir, 'payswarm-auth', 'services.payswarm.identifier'),
  path.join(_libdir, 'payswarm-auth', 'services.promo'),
  //path.join(_libdir, 'payswarm-auth', 'services.system'),
  //path.join(_libdir, 'payswarm-auth', 'services.test'),
  //path.join(_libdir, 'payswarm-auth', 'services.tools'),
  path.join(_libdir, 'payswarm-auth', 'services.transaction'),
  path.join(_libdir, 'payswarm-auth', 'services.vendor'),
  path.join(_libdir, 'payswarm-auth', 'services.well-known')
];

// app info
config.app.masterTitle = 'payswarm1d';
config.app.workerTitle = 'payswarm1d-worker';
config.app.restartWorkers = false;
// system group and user IDs (can be groupname/username instead of numbers)
config.app.user.groupId = process.getgid();
config.app.user.userId = process.getuid();

// config environment
config.environment = 'bin';

// monitor config
config.monitors = {};

// logging
config.loggers.app.filename = path.join(_logdir, 'payswarm-dev-bin-app.log');
config.loggers.access.filename = path.join(_logdir, 'payswarm-dev-bin-access.log');
config.loggers.error.filename = path.join(_logdir, 'payswarm-dev-bin-error.log');
config.loggers.email.silent = true;
config.loggers.email.to = ['cluster@payswarm.com'];
config.loggers.email.from = 'cluster@payswarm.com';

// server info
// 0 means use # of cpus
config.server.workers = 1;
config.server.port = 30443;
config.server.httpPort = 30080;
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
config.server.session.secret = '0123456789abcdef';
config.server.session.key = 'payswarm.sid';
config.server.session.prefix = 'payswarm.';

// limiter config
config.limiter.ipRequestsPerHour = 0;

// database config
config.database.name = 'payswarm_dev';
config.database.host = 'localhost';
config.database.port = 27017;
config.database.username = 'payswarm';
config.database.password = 'password';
config.database.adminPrompt = true;
config.database.local.collection = 'payswarm_dev';

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
config.authority.name = 'PaySwarm Dev Authority';

// mail config
config.mail.connection = {
  host: 'mail.digitalbazaar.com',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {
  productionMode: config.website.views.vars.productionMode,
  baseUri: config.authority.baseUri,
  serviceHost: config.server.host,
  serviceDomain: config.server.domain,
  supportDomain: config.server.domain,
  subjectPrefix: '[DEV] ',
  identitySubjectPrefix: '[DEV] ',
  serviceName: 'PaySwarm Development',
  machine: require('os').hostname()
};

// branding
config.brand.name = 'PaySwarm Development';

// identity credentials config
config.identityCredentials.allowInsecureCallback = true;

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

require('./dev-data');

// custom tool config
var toolConfig = config.tool || {};
// add modules to main modules list
((config.tool || {}).modules || []).forEach(function(mod) {
  config.modules.push(mod);
});
// load configs
((config.tool || {}).configs || []).forEach(function(cfg) {
  require(cfg);
});
