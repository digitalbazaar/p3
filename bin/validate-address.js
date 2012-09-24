var async = require('async');
var program = require('commander');
var fs = require('fs');
var payswarm = {
  tools: require('../lib/payswarm-auth/tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// include yahoo address validator config and module
require('../configs/yahoo-av');
var yav = require('../lib/payswarm-auth/av.yahoo');

var APP_NAME = 'payswarm.apps.YahooAddressValidator';
process.title = 'yahoo-av';

program
  .version('0.0.1')
  .option('--address <filename>', 'The JSON file containing the address to ' +
    'validate')
  .option('--no-review', 'Do not require confirmation before sending ' +
    'the request.')
  .option('--debug', 'Write debug output to the console.')
  .parse(process.argv);

// validate arguments
if(!program.address) {
  console.log('\nError: Missing required option "--address".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}

var options = {
  confirm: program.review,
  debug: ('debug' in program ? program.debug : true)
};

console.log('\nYahoo Address Validator:\n');

async.waterfall([
  function(callback) {
    yav.init(callback);
  },
  function(callback) {
    var filename = program.address;
    try {
      // FIXME: validate input
      var input = JSON.parse(fs.readFileSync(filename, 'utf8'));
      return callback(null, input);
    }
    catch(ex) {
      return callback(ex);
    }
  },
  function(input, callback) {
    if(!options.confirm) {
      return callback(null, input);
    }
    console.log('Input: ' + JSON.stringify(input, null, 2));
    console.log();
    var prompt = 'Do you want to validate this address? ';
    program.confirm(prompt, function(ok) {
      if(!ok) {
        console.log('\nQuitting...');
        process.exit();
      }
      callback(null, input);
    });
  },
  function(input, callback) {
    console.log('\nSending request...');
    yav.validateAddress(input, callback);
  }
], function(err, address) {
  if(err) {
    console.log('\n' + err, err.stack ? err.stack : '');
    if(err.cause) {
      console.log('\nCause:\n' + err.cause,
        err.cause.stack ? err.cause.stack : '');
    }
    process.exit(1);
  }
  console.log('Result: ' + JSON.stringify(address, null, 2));
  process.exit();
});
