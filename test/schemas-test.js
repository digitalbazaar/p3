var vows = require('vows');
var coverage = require('./coverage');

var batch = coverage.require('../lib/payswarm-auth/test.schemas');

vows.describe('schemas test').addBatch(batch).export(module, {error: false});
