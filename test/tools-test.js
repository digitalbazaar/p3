var vows = require('vows');
var coverage = require('./coverage');

var batch = coverage.require('../lib/payswarm-auth/test.tools');

vows.describe('tools test').addBatch(batch).export(module, {error: false})
