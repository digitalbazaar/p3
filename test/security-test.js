var vows = require('vows');
var coverage = require('./coverage');

var batch = coverage.require('../lib/payswarm-auth/test.security');

vows.describe('security test').addBatch(batch).export(module, {error: false})
