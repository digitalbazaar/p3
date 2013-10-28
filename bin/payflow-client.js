__libdir = require('path').resolve(__dirname, '../lib');
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
    'send to the gateway.')
  .option('--verify <filename>', 'A JSON-LD file containing credit card ' +
    'information that is to be verified. A payment token will be output ' +
    'on success.')
  .option('--charge <filename>', 'A JSON-LD file containing a payment ' +
    'token to charge. The "--amount" parameter must also be specified.')
  .option('--hold <filename>', 'A JSON-LD file containing a payment ' +
    'token with funds to hold. The "--amount" parameter must also be ' +
    'specified.')
  .option('--capture <filename>', 'A JSON-LD file containing a transaction ' +
    'with psaGatewayRefId set to the ID of a payflow transaction with held ' +
    'funds to be captured. The "--amount" parameter may be optionally ' +
    'specified.')
  .option('--amount <amount>', 'A dollar amount to charge (eg: "1.00").')
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
if(!program.request && !program.verify && !program.charge && !program.hold &&
  !program.capture) {
  console.log('\nError: Missing required option ' +
    '"--request", "--verify", "--charge", "--hold", or "--capture".');
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
if(program.request && program.hold) {
  console.log('\nError: Incompatible options "--request" and "--hold".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.request && program.capture) {
  console.log('\nError: Incompatible options "--request" and "--capture".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.charge && program.hold) {
  console.log('\nError: Incompatible options "--charge" and "--hold".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.charge && program.capture) {
  console.log('\nError: Incompatible options "--charge" and "--capture".');
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
if(program.hold && !program.amount) {
  console.log('\nError: You must provide "--amount" with "--hold".');
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
    var filename = (program.request || program.verify || program.charge ||
      program.hold || program.capture);
    try {
      var data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if('amount' in program) {
        // FIXME: validate program.amount
      }
      if(program.request) {
        return callback(null, data);
      }
      if(program.verify) {
        source = data;
        return callback(null, client.createVerifyRequest(data));
      }
      if(program.charge) {
        return callback(null, client.createChargeRequest(data, program.amount));
      }
      if(program.hold) {
        return callback(null, client.createHoldRequest(data, program.amount));
      }
      if(program.capture) {
        var options = {};
        if('amount' in program) {
          options.amount = program.amount;
        }
        return callback(null, client.createCaptureRequest(data, options));
      }
    }
    catch(ex) {
      return callback(ex);
    }
  },
  function(req, callback) {
    if(!config.confirm) {
      return callback(null, req);
    }
    if(config.mode === 'live') {
      console.log('*** WARNING: LIVE GATEWAY WILL BE USED ***\n');
    }
    console.log('Mode: ' + config.mode);
    console.log('Timeout: ' + config.timeout);
    console.log('Request:');
    console.log(JSON.stringify(req, null, 2) + '\n');
    program.confirm('Do you want to send this request? ', function(ok) {
      if(!ok) {
        console.log('\nQuitting...');
        process.exit();
      }
      callback(null, req);
    });
  },
  function(req, callback) {
    console.log('\nSending request...');
    client.send(req, callback);
  },
  function(res, callback) {
    if(program.verify) {
      res.paymentToken = client.createPaymentToken(source, res);
    }
    callback(null, res);
  }
], function(err, res) {
  if(err) {
    console.log('\n' + err, err.stack ? err.stack : '');
    process.exit(1);
  }
  console.log('Response:' + JSON.stringify(res, null, 2));
  process.exit();
});
