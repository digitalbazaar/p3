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
  .option('--timeout <timeout>', 'The request timeout in seconds.', parseInt)
  .option('--no-review', 'Do not require confirmation before sending ' +
    'the request.')
  .option('--live', 'Use the Payflow Gateway in live mode. *DANGER* this ' +
    'uses *REAL* money.')
  .option('--debug', 'Write debug output to the console.')
  .parse(process.argv);

// check required arguments
if(!program.auth) {
  console.log('\nError: Missing required option "--auth".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(!program.request) {
  console.log('\nError: Missing required option "--request".');
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

async.auto({
  getAuth: function(callback) {
    try {
      var auth = JSON.parse(fs.readFileSync(program.auth, 'utf8'));
      callback(null, auth);
    }
    catch(ex) {
      callback(ex);
    }
  },
  getRequest: function(callback) {
    try {
      var request = JSON.parse(fs.readFileSync(program.request, 'utf8'));
      callback(null, request);
    }
    catch(ex) {
      callback(ex);
    }
  },
  confirm: ['getAuth', 'getRequest', function(callback, results) {
    if(!config.confirm) {
      return callback();
    }
    var request = results.getRequest;
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
  }],
  sendRequest: ['confirm', function(callback, results) {
    console.log('\nSending request...');
    var auth = results.getAuth;
    var request = results.getRequest;
    var client = new PayflowClient({
      mode: config.mode,
      timeout: config.timeout,
      user: auth.user,
      vendor: auth.vendor,
      partner: auth.partner,
      password: auth.password,
      debug: config.debug
    });
    client.send(request, callback);
  }]
}, function(err) {
  if(err) {
    console.log('\n' + err, err.stack ? err.stack : '');
    process.exit(1);
  }
  process.exit();
});
