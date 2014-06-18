// ensure local helper is loaded
require(__dirname + '/tests/frontend/helper');

var config = require(
  __dirname + '/node_modules/bedrock/protractor.conf').config;
exports.config = config;

var bedrockSuites = config.suites;
config.suites = {
  unit: bedrockSuites.unit,
  e2e: [bedrockSuites.e2e, __dirname + '/tests/frontend/e2e/**/*js']
};
