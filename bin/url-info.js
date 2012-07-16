var async = require('async');
var program = require('commander');
var jsdom = require('jsdom');
var jsonld = require('jsonld');
var RDFa = require('./rdfa');
var util = require('util');
var payswarm = {
  security: require('./payswarm.security'),
  tools: require('./payswarm.tools.js')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

var APP_NAME = 'payswarm.apps.UrlInfo';
process.title = 'url-info';

program
  .version('0.0.1')
  .option('--base-uri [base]', 'The base URI to use.')
  .option('--verbose', 'Verbose output. (default: true)')
  .option('--quiet', 'Quieter output (default: false).')
  .option('--full', 'Show all resource info. (default: false)')
  .option('--all', 'Show info for all types. (default: true)')
  .option('--assets', 'Show info for Assets. (overrides --all)')
  .option('--licenses', 'Show info for Licenses. (overrides --all)')
  .option('--listings', 'Show info for Listings. (overrides --all)')
  .option('--hash', 'Hash JSON-LD. (default: true)')
  .option('--dump', 'Dump JSON-LD. (default: true)')
  .option('--no-normalized', 'Do not dump normalized JSON-LD. (default: true)')
  .option('--compact', 'Dump in compacted JSON-LD. (default: false)')
  .option('--json', 'Expect JSON input instead of RDFa. (default: false)')
  .parse(process.argv);

// FIXME: can this be done with commander?
// set defaults
if(!('base' in program)) {
  program.base = '';
}
if(!('verbose' in program)) {
  program.verbose = true;
}
if(!('all' in program)) {
  program.all = true;
}
if(!('hash' in program)) {
  program.hash = true;
}
if(!('dump' in program)) {
  program.dump = true;
}
if(program.compact) {
  program.normalized = false;
}

var source = null;

if(program.args.length === 0) {
  source = 'stdin';
  program.prompt(util.format('Reading %s from standard input:',
    program.json ? 'JSON' : 'RDFa'), processInput);
}
else {
  source = program.args[0];
  processInput(source);
}

function processInput(input) {
  async.waterfall([
    function(callback) {
      // input is JSON
      if(program.json) {
        try {
          var data = JSON.parse(input);
          return callback(null, data);
        }
        catch(ex) {
          return callback(ex);
        }
      }

      // input is RDFa
      jsdom.env(input, function(errors, window) {
        if(errors && errors.length > 0) {
          console.log('DOM Errors:', errors);
          process.exit(1);
        }

        try {
          // extract JSON-LD from RDFa
          RDFa.attach(window.document);
          jsonld.fromRDF(window.document.data, {format: 'rdfa-api'}, callback);
        }
        catch(ex) {
          return callback(ex);
        }
      });
    },
    function(data, callback) {
      if(program.verbose) {
        console.log('* %s to JSON-LD', program.json ? 'JSON' : 'RDFa');
        console.log('* <source>:\n%s', source ? source : '(unknown)');
      }
      callback(null, data);
    },
    function(data, callback) {
      if(program.full) {
        return processType(data, null, callback);
      }
      callback(null, data);
    },
    function(data, callback) {
      if(program.all || program.assets) {
        return processType(data, 'ps:Asset', callback);
      }
      callback(null, data);
    },
    function(data, callback) {
      if(program.all || program.licenses) {
        return processType(data, 'ps:License', callback);
      }
      callback(null, data);
    },
    function(data, callback) {
      if(program.all || program.listings) {
        return processType(data, 'ps:Listing', callback);
      }
      callback(null, data);
    }
  ], function(err) {
    if(err) {
      console.log('Error:', err, err.stack ? err.stack : '');
      process.exit(1);
    }
    process.exit();
  });
}

function processType(data, type, callback) {
  async.waterfall([
    function(callback) {
      if(!type) {
        return callback(null, data);
      }
      var frames = payswarm.tools.getDefaultJsonLdFrames();
      if(!(type in frames)) {
        return callback(new PaySwarmError(
          'No frame for type.',
          APP_NAME + '.InvalidType', {type: type}));
      }
      jsonld.frame(data, frames[type], {base: program.base}, callback);
    },
    function(data, callback) {
      if(program.hash) {
        return payswarm.security.hashJsonLd(data, function(err, hash) {
          if(err) {
            return callback(err);
          }
          if(program.verbose) {
            console.log('* <source>|%s|JSON-LD|%snormalize|SHA-1|<stdout>:',
              program.json ? 'JSON' : 'RDFa',
              type ? ('frame(' + type + ')|') : '');
          }
          console.log(hash);
          callback(null, data);
        });
      }
      callback(null, data);
    },
    function(data, callback) {
      if(program.normalized) {
        return jsonld.normalize(
          data, {base: program.base, format: 'application/nquads'}, callback);
      }
      callback(null, data);
    },
    function(data, callback) {
      if(program.dump) {
        console.log('* <source>|%s|JSON-LD|%s%s<stdout>:',
          program.json ? 'JSON' : 'RDFa',
          type ? ('frame(' + type + ')|') : '',
          program.normalized ? 'normalize|' :
            (program.compact ? 'compact|' : ''));
        if(program.normalized) {
          console.log(data);
        }
        else if(program.compact) {
          console.log(JSON.stringify(data));
        }
        else {
          console.log(JSON.stringify(data, null, 2));
        }
      }
      callback();
    }
  ], function(err) {
    if(err) {
      return callback(err);
    }
    callback(null, data);
  });
}
