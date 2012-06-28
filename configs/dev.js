var config = require('../lib/payswarm-auth').config;

// app info
config.app.masterTitle = 'payswarm1d';
config.app.workerTitle = 'payswarm1d-worker';
config.app.restartWorkers = false;
// system group and user IDs (can be groupname/username instead of numbers)
config.app.user.groupId = process.getuid();
config.app.user.userId = process.getgid();

// config environment
config.environment = 'development';
//config.environment = 'testing';
//config.environment = 'sandbox';
//config.environment = 'production';

// logging
config.loggers.app.filename = '/tmp/payswarm-dev-app.log';
config.loggers.access.filename = '/tmp/payswarm-dev-access.log';
config.loggers.error.filename = '/tmp/payswarm-dev-error.log';
config.loggers.email.silent = true;

// server info
// 0 means use # of cpus
config.server.workers = 1;
config.server.port = 19443;
config.server.httpPort = 19100;
config.server.bindAddr = ['payswarm.dev'];
config.server.domain = 'payswarm.dev';
config.server.host = 'payswarm.dev:19443';
config.server.key = __dirname + '/../pki/test-payswarm-auth.key';
config.server.cert = __dirname + '/../pki/test-payswarm-auth.crt';

// session info
config.server.session.secret = '0123456789abcdef';
config.server.session.key = 'payswarm.sid';
config.server.session.prefix = 'payswarm.';

// server static resource config
//config.server.static = [__dirname + '/../site/static'];
config.server.staticOptions = {
  maxAge: config.server.cache.maxAge
};

// database config
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
config.database.local.path = '/tmp/payswarm-dev.local.db';

// authority config
config.authority = {};
config.authority.baseUri = 'https://' + config.server.host;
config.authority.id = config.authority.baseUri + '/i/authority';
config.authority.name = 'PaySwarm Dev Authority';
config.authority.slug = 'dev';

// address validator
config.addressValidator.module = './payswarm.av.test';

// financial config
config.financial.defaults = {
  account: {},
  paymentTokens: [],
  paymentGateway: 'Test'
};

// mail config
config.mail.connection = {
  host: 'mail.digitalbazaar.com',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {
  // FIXME
  productionMode: config.website.views.vars.productionMode,
  serviceDomain: 'payswarm.dev',
  supportDomain: 'payswarm.com',
  subjectPrefix: '[DEV] ',
  profileSubjectPrefix: '[DEV] ',
  serviceName: 'PaySwarm Development',
  machine: require('os').hostname()
};

require('./roles');
require('./common-data');
require('./dev-data');
