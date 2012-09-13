var async = require('async');
var program = require('commander');
var fs = require('fs');
var uepc = require('../lib/payswarm-auth/usaepay-client');
var USAePayClient = uepc.USAePayClient;

var APP_NAME = 'payswarm.apps.USAePayClient';
process.title = 'usaepay-client';

program
  .version('0.0.1')
  .option('--auth <filename>', 'The JSON file containing gateway credentials.')
  .option('--verify <filename>', 'A JSON-LD file containing ' +
    'bank account information that is to be verified. A payment token ' +
    'will be output on success.')
  .option('--charge <filename>', 'A JSON-LD file containing a payment ' +
    'token to charge. The "--amount" parameter must also be specified.')
  .option('--credit <filename>', 'A JSON-LD file containing a payment ' +
    'token to credit. The "--amount" parameter must also be specified.')
  .option('--amount <amount>', 'A dollar amount to charge/credit (eg: "1.00").')
  .option('--timeout <timeout>', 'The request timeout in seconds.', parseInt)
  .option('--no-review', 'Do not require confirmation before sending ' +
    'the request.')
  .option('--live', 'Use the USAePay Gateway in live mode. *DANGER* this ' +
    'uses *REAL* money.')
  .option('--debug', 'Write debug output to the console.')
  .parse(process.argv);

// validate arguments
if(!program.auth) {
  console.log('\nError: Missing required option "--auth".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(!program.verify && !program.charge && !program.credit) {
  console.log('\nError: Missing required option ' +
    '"--verify" or "--charge" or "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.verify && program.charge) {
  console.log('\nError: Incompatible options "--verify" and "--charge".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.verify && program.credit) {
  console.log('\nError: Incompatible options "--verify" and "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.charge && program.credit) {
  console.log('\nError: Incompatible options "--charge" and "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.verify && program.amount) {
  console.log('\nError: Incompatible options "--verify" and "--amount".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.charge && !program.amount) {
  console.log('\nError: You must provide "--amount" with "--charge".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.credit && !program.amount) {
  console.log('\nError: You must provide "--amount" with "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}

var config = {
  confirm: program.review,
  mode: 'sandbox',
  timeout: program.timeout || 45,
  debug: true
};
if(program.live) {
  config.mode = 'live';
}
// FIXME: remove me
if(config.mode === 'live') {
  console.log('\nError: "live" mode not supported yet.');
  process.exit(1);
}

console.log('\nUSAePay Client:\n');
var client;
var source;

async.waterfall([
  function(callback) {
    try {
      var auth = JSON.parse(fs.readFileSync(program.auth, 'utf8'));
      client = new USAePayClient({
        mode: config.mode,
        wsdlKey: auth.wsdlKey,
        sourceKey: auth.sourceKey,
        timeout: config.timeout,
        debug: config.debug
      });
      callback();
    }
    catch(ex) {
      callback(ex);
    }
  },
  function(callback) {
    var filename = program.verify || program.charge || program.credit;
    try {
      var paymentMethod = JSON.parse(fs.readFileSync(filename, 'utf8'));
      // FIXME: validate payment method
      if(program.charge || program.credit) {
        // FIXME: validate program.amount
      }
      return callback(null, paymentMethod);
    }
    catch(ex) {
      return callback(ex);
    }
  },
  function(paymentMethod, callback) {
    if(!config.confirm) {
      return callback(null, paymentMethod);
    }
    console.log('Mode: ' + config.mode);
    console.log('Timeout: ' + config.timeout);
    console.log('Payment Method: ' +
      JSON.stringify(paymentMethod, null, 2) + '\n');
    var prompt = 'Do you want to ';
    if(program.verify) {
      prompt += 'verify this bank account?';
    }
    else {
      prompt += program.charge ? 'charge' : 'credit';
      prompt += ' this payment token?';
    }

    program.confirm(prompt, function(ok) {
      if(!ok) {
        console.log('\nQuitting...');
        process.exit();
      }
      callback(null, paymentMethod);
    });
  },
  function(paymentMethod, callback) {
    console.log('\nSending request...');
    if(program.verify) {
      client.verify(paymentMethod, callback);
    }
    else {
      var method = program.charge ? client.charge : client.credit;
      method.call(client, paymentMethod, program.amount, callback);
    }
  }
], function(err, res) {
  if(err) {
    console.log('\n' + err, err.stack ? err.stack : '');
    process.exit(1);
  }
  console.log('Response: ' + JSON.stringify(res, null, 2));
  process.exit();
});
