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
  path.join(_libdir, 'payswarm-auth', 'monitors'),
  'database',
  'scheduler',
  'mail',
  'permission',
  'identity',
  path.join(_libdir, 'payswarm-auth', 'identityAddress'),
  path.join(_libdir, 'payswarm-auth', 'identityPreferences'),
  path.join(_libdir, 'payswarm-auth', 'identityAuthority'),
  path.join(_libdir, 'payswarm-auth', 'resource'),
  path.join(_libdir, 'payswarm-auth', 'financial'),
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
  path.join(_libdir, 'payswarm-auth', 'services.assetora'),
  path.join(_libdir, 'payswarm-auth', 'services.budget'),
  //path.join(_libdir, 'payswarm-auth', 'services.hosted.asset'),
  //path.join(_libdir, 'payswarm-auth', 'services.hosted.listing'),
  path.join(_libdir, 'payswarm-auth', 'services.license'),
  path.join(_libdir, 'payswarm-auth', 'services.paymentToken'),
  path.join(_libdir, 'payswarm-auth', 'services.promo'),
  path.join(_libdir, 'payswarm-auth', 'services.system'),
  path.join(_libdir, 'payswarm-auth', 'services.test'),
  path.join(_libdir, 'payswarm-auth', 'services.tools'),
  path.join(_libdir, 'payswarm-auth', 'services.transaction')
];

// app info
config.app.masterTitle = 'payswarm1d';
config.app.workerTitle = 'payswarm1d-worker';
config.app.restartWorkers = false;
// system group and user IDs (can be groupname/username instead of numbers)
config.app.user.groupId = process.getgid();
config.app.user.userId = process.getuid();

// config environment
config.environment = 'development';

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
// 0 means use # of cpus
config.server.workers = 1;
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
  profileSubjectPrefix: '[DEV] ',
  serviceName: 'PaySwarm Development',
  machine: require('os').hostname()
};

// branding
config.brand.name = 'PaySwarm Development';

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

config.website.views.vars.debug = true;

// identity credentials config
config.identityCredentials.allowInsecureCallback = true;

var clientData = config.website.views.vars.clientData;
clientData.baseUri = config.server.baseUri;
clientData.siteTitle = config.brand.name;
clientData.productionMode = false;

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
