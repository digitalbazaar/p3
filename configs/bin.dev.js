/*
 * PaySwarm development configuration.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// load common config
require('./common');

// location of logs
var _logdir = '/tmp';

// modules to load
config.modules = [
  'database'
];

// core
config.core.workers = 1;
config.core.master.title = 'payswarm1d';
config.core.worker.title = 'payswarm1d-worker';
config.core.worker.restart = false;

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
  productionMode: config.views.vars.productionMode,
  baseUri: config.authority.baseUri,
  subject: {
    prefix: '[PaySwarm BIN DEV] ',
    identityPrefix: '[PaySwarm BIN DEV] '
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

// identity credentials config
config.idp.allowInsecureCallback = true;

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
