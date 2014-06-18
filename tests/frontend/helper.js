// get bedrock helper
var api = require('../../node_modules/bedrock/tests/frontend/helper');
module.exports = api;

api.on('init', function() {
  api.selectors = require('./selectors');
  api.pages = require('./pages');
});
