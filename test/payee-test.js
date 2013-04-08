var vows = require('vows');
var coverage = require('./coverage');

var batch = coverage.require('../lib/payswarm-auth/test.payee');

vows.describe('payee test').addBatch(batch).export(module, {error: false});
