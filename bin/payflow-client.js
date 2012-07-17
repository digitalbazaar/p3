var async = require('async');
var program = require('commander');
var fs = require('fs');
var pfc = require('../lib/payswarm-auth/payflow-client');
var PayflowClient = pfc.PayflowClient;

var APP_NAME = 'payswarm.apps.PayflowClient';
process.title = 'payflow-client';

program
  .version('0.0.1')
  .option('--auth <filename>', 'The JSON file containing gateway credentials.')
  .option('--request <filename>', 'A JSON file containing a request to ' +
    'send to the Payflow Gateway.')
  .option('--verify <filename>', 'A JSON-LD file containing credit card ' +
    'or bank account information that is to be verified. A payment token ' +
    'is output.')
  .option('--charge <filename>', 'A JSON-LD file containing a payment ' +
    'token to charge. The "--amount" parameter must also be specified.')
  .option('--timeout <timeout>', 'The request timeout in seconds.', parseInt)
  .option('--no-review', 'Do not require confirmation before sending ' +
    'the request.')
  .option('--live', 'Use the Payflow Gateway in live mode. *DANGER* this ' +
    'uses *REAL* money.')
  .option('--debug', 'Write debug output to the console.')
  .parse(process.argv);

// validate arguments
if(!program.auth) {
  console.log('\nError: Missing required option "--auth".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(!program.request && !program.verify && !program.charge) {
  console.log('\nError: Missing required option ' +
    '"--request" or "--verify" or "--charge".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.request && program.verify) {
  console.log('\nError: Incompatible options "--request" and "--verify".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.request && program.charge) {
  console.log('\nError: Incompatible options "--request" and "--charge".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.request && program.amount) {
  console.log('\nError: Incompatible options "--request" and "--amount".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.verify && program.amount) {
  console.log('\nError: Incompatible options "--verify" and "--amount".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.charge && !program.amount) {
  console.log('\nError: You must provide an "--amount" with "--charge".');
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

console.log('\nPayflow Client:\n');
var client;
var source;

async.waterfall([
  function(callback) {
    try {
      var auth = JSON.parse(fs.readFileSync(program.auth, 'utf8'));
      client = new PayflowClient({
        mode: config.mode,
        timeout: config.timeout,
        user: auth.user,
        vendor: auth.vendor,
        partner: auth.partner,
        password: auth.password,
        debug: config.debug
      });
      callback();
    }
    catch(ex) {
      callback(ex);
    }
  },
  function(callback) {
    var filename = program.request || program.verify || program.charge;
    try {
      var data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if(program.request) {
        return callback(null, data);
      }
      if(program.verify) {
        source = data;
        return callback(null, client.createVerifyRequest(data));
      }
      if(program.charge) {
        return callback(null, client.createChargeRequest(data));
      }
    }
    catch(ex) {
      return callback(ex);
    }
  },
  function(callback, request) {
    if(!config.confirm) {
      return callback(null, request);
    }
    console.log('Mode: ' + config.mode);
    console.log('Timeout: ' + config.timeout);
    console.log('Request: ', JSON.stringify(request, null, 2) + '\n');
    program.confirm('Do you want to send this request? ', function(ok) {
      if(!ok) {
        console.log('\nQuitting...');
        process.exit();
      }
      callback();
    });
  },
  function(callback, request) {
    console.log('\nSending request...');
    client.send(request, callback);
  },
  function(callback, response) {
    if(program.verify) {
      response.paymentToken = client.createPaymentToken(source, response);
    }
    callback(null, response);
  }
], function(err) {
  if(err) {
    console.log('\n' + err, err.stack ? err.stack : '');
    process.exit(1);
  }
  console.log('Response:');
  console.log(JSON.stringify(response, null, 2));
  process.exit();
});
