var path = require('path');
var _pslibdir = path.resolve(path.join(
  __dirname, '..', 'lib', 'payswarm-auth'));
var async = require('async');
var bedrock = require('bedrock');
var fs = require('fs');

// load required modules
var config = bedrock.module('config');
config.tool = config.tool || {};
config.tool.modules = [
  path.join(_pslibdir, 'promo')
];

var APP_NAME = 'payswarm.apps.PromotionEditor';

/** Example Promo File Content
{
  "promoCode": "ABC",
  "expires": "2013-03-22T19:38:10Z",
  "redeemable": 1,
  "deposit": [{
    "amount": "1.0000000000",
    "currency": "USD",
    "comment": "The reason for the funds"
  }],
  "title": "The Promotion Title",
  "description": "The promotion description."
}
*/

console.log('\nPromotion Editor:\n');

// FIXME: see audit tool to add options like config, etc.
var program = bedrock.program
  .version('0.0.1')
  .option(
    '--create <filename>', 'The JSON file containing the promotion details.');

async.waterfall([
  function(callback) {
    // start bedrock
    bedrock.start(callback);
  },
  function(callback) {
    if(!program.create) {
      console.log('\nError: Missing required option "--create".');
      process.stdout.write(program.helpInformation());
      process.exit(1);
    }

    var payswarm = {
      config: bedrock.module('config'),
      db: bedrock.module('bedrock.database'),
      promo: require('../lib/payswarm-auth/promo'),
      validation: bedrock.module('validation')
    };

    console.log('\nCreating new promotion from file: "' +
      program.create + '"...');
    var promo = JSON.parse(fs.readFileSync(program.create, 'utf8'));
    var schema = require('../schemas/promo')();
    return payswarm.validation.validateInstance(promo, schema, function(err) {
      if(err) {
        return callback(err);
      }
      payswarm.promo.createPromo(null, promo, callback);
    });
  }
], function(err) {
  if(err) {
    console.log('\n' + err, err.stack ? err.stack : '');
    process.exit(1);
  }
  console.log('\nPromotion created.');
  process.exit();
});
