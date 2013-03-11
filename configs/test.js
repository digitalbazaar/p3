var path = require('path');
__libdir = process.env['PAYSWARM_AUTH_COV'] ?
  path.resolve(__dirname, '../lib-cov') :
  path.resolve(__dirname, '../lib');
var config = require(__libdir + '/config');

// add test module
config.modules.push('test');

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
config.loggers.app.filename = '/tmp/payswarm-test-app.log';
config.loggers.access.filename = '/tmp/payswarm-test-access.log';
config.loggers.error.filename = '/tmp/payswarm-test-error.log';
config.loggers.email.silent = true;

// only log emergency errors by default
config.loggers.console.level = 'emergency';

// server info
// 0 means use # of cpus
config.server.workers = 1;
config.server.port = 18443;
config.server.httpPort = 18100;
config.server.bindAddr = ['payswarm.dev'];
config.server.domain = 'payswarm.dev';
config.server.host = 'payswarm.dev:18443';
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
config.database.name = 'payswarm_test';
config.database.host = 'localhost';
config.database.port = 27017;
config.database.local.collection = 'payswarm_test';

// authority config
config.authority.baseUri = 'https://' + config.server.host;
config.authority.id = config.authority.baseUri + '/i/authority';
config.authority.name = 'PaySwarm Dev Test Authority';
config.authority.profile = config.authority.baseUri + '/profiles/authority';

// address validator
config.addressValidator.module = './av.test';

// financial config
config.financial.defaults = {
  account: {},
  paymentTokens: [],
  paymentGateways: {
    CreditCard: 'Test',
    BankAccount: 'Test'
  }
};

// mail config
config.mail.connection = {
  host: 'mail.digitalbazaar.com',
  ssl: false
};
config.mail.send = false;
config.mail.vars = {
  productionMode: config.website.views.vars.productionMode,
  serviceHost: config.server.host,
  serviceDomain: config.server.domain,
  supportDomain: config.server.domain,
  subjectPrefix: '[TEST] ',
  profileSubjectPrefix: '[TEST] ',
  serviceName: 'PaySwarm Dev Test',
  machine: require('os').hostname()
};

require('./roles');
require('./common-data');
require('./dev-data');
