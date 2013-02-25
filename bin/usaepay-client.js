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
  .option('--tokenize <filename>', 'A JSON-LD file containing ' +
    'bank account information that is to be verified. A payment token ' +
    'will be output on success.')
  .option('--get <filename>', 'A JSON-LD file containing either ' +
    'a payment token to get the associated bank account for or a ' +
    'transaction to get the status for.')
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
if(!program.tokenize && !program.get && !program.charge && !program.credit) {
  console.log('\nError: Missing required option ' +
    '"--tokenize", "--get", "--charge", or "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.tokenize && program.get) {
  console.log('\nError: Incompatible options "--tokenize" and "--get".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.tokenize && program.charge) {
  console.log('\nError: Incompatible options "--tokenize" and "--charge".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.tokenize && program.credit) {
  console.log('\nError: Incompatible options "--tokenize" and "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.get && program.charge) {
  console.log('\nError: Incompatible options "--get" and "--charge".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.get && program.credit) {
  console.log('\nError: Incompatible options "--get" and "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.charge && program.credit) {
  console.log('\nError: Incompatible options "--charge" and "--credit".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.tokenize && program.amount) {
  console.log('\nError: Incompatible options "--tokenize" and "--amount".');
  process.stdout.write(program.helpInformation());
  process.exit(1);
}
if(program.get && program.amount) {
  console.log('\nError: Incompatible options "--get" and "--amount".');
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

console.log('\nUSAePay Client:\n');
var client;
var source;

async.waterfall([
  function(callback) {
    try {
      var auth = JSON.parse(fs.readFileSync(program.auth, 'utf8'));
      client = new USAePayClient({
        mode: config.mode,
        wsdlDir: auth.wsdlDir,
        sourceKey: auth.sourceKey,
        pin: auth.pin,
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
    client.init(callback);
  },
  function(callback) {
    var filename = program.tokenize || program.get ||
      program.charge || program.credit;
    try {
      // FIXME: validate input
      var input = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if(program.charge || program.credit) {
        // FIXME: validate program.amount
      }
      return callback(null, input);
    }
    catch(ex) {
      return callback(ex);
    }
  },
  function(input, callback) {
    if(!config.confirm) {
      return callback(null, input);
    }
    if(config.mode === 'live') {
      console.log('*** WARNING: LIVE GATEWAY WILL BE USED ***\n');
    }
    console.log('Mode: ' + config.mode);
    console.log('Timeout: ' + config.timeout);
    console.log('Input: ' + JSON.stringify(input, null, 2));
    if(program.amount) {
      console.log('Amount: ' + program.amount);
    }
    console.log();
    var prompt = 'Do you want to ';
    if(program.tokenize) {
      prompt += 'tokenize this bank account? ';
    }
    else if(program.get) {
      if(input.type === 'PaymentToken') {
        prompt += 'get the bank account associated with this payment token? ';
      }
      else {
        prompt += 'get the status associated with this transaction? ';
      }
    }
    else {
      prompt += program.charge ? 'charge' : 'credit';
      prompt += ' this payment token? ';
    }

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
    if(program.tokenize) {
      client.tokenize(input, callback);
    }
    else if(program.get) {
      if(input.type === 'PaymentToken') {
        client.getBankAccount(input, callback);
      }
      else {
        client.inquire(input, callback);
      }
    }
    else {
      var method = program.charge ? client.charge : client.credit;
      method.call(client, input, program.amount, callback);
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
