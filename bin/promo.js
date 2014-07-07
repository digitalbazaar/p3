GLOBAL.__libdir = require('path').resolve(__dirname, '../lib');
var async = require('async');
var program = require('commander');
var fs = require('fs');
var payswarm = {
  db: require('../lib/payswarm-auth/database'),
  promo: require('../lib/payswarm-auth/promo'),
  validation: require('../lib/payswarm-auth/validation')
};

var APP_NAME = 'payswarm.apps.PromotionEditor';

// FIXME: see audit tool to add options like config, etc.
program
  .version('0.0.1')
  .option('--create <filename>', 'The JSON file containing the promotion details.')
  .parse(process.argv);

if(!program.create) {
  console.log('\nError: Missing required option "--create".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}

// log uncaught exception and exit
process.on('uncaughtException', function(err) {
  console.log(err.toString(), err.stack ? {stack: err.stack} : null);
  process.removeAllListeners('uncaughtException');
  process.exit();
});

console.log('\nPromotion Editor:\n');

async.waterfall([
  function(callback) {
    // init database
    payswarm.db.init(null, callback);
  },
  function(callback) {
    payswarm.promo.init(null, callback);
  },
  function(callback) {
    if(program.create) {
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
    callback();
  }
], function(err) {
  if(err) {
    console.log('\n' + err, err.stack ? err.stack : '');
    process.exit(1);
  }
  if(program.create) {
    console.log('\nPromotion created.');
  }
  process.exit();
});
