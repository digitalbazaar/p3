var vows = require('vows');
var coverage = require('./coverage');

var batch = coverage.require('../lib/payswarm-auth/test.money');

vows.describe('money test').addBatch(batch).export(module, {error: false})
