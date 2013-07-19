#!/usr/bin/env node

'use strict';

var program = require('commander');
var fs = require('fs');
var async = require('async');

// Checkout the following repo and rebuild the data:
var repo = 'https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes';

// JSON file with all the ISO 3166 data
var allfile = 'ISO-3166-Countries-with-Regional-Codes/all/all.json';

program
  .option('-f, --file <file>', 'JSON file with all the ISO 3166 data.', allfile)
  .option('--client', 'Generate data for payswarm.services.js')
  .option('--payflow', 'Generate data for payflow-client.js')
  .option('--schemas', 'Generate data for schemas/address.js')
  .on('--help', function() {
    console.log();
    console.log('  - Checkout the following repo.');
    console.log('  - Rebuild the data.');
    console.log('  - Run this tool, and copy data to appropriate files.');
    console.log();
    console.log('  ' + repo);
    console.log();
  });

program.parse(process.argv);

async.waterfall([
  function(callback) {
    // Load data
    fs.readFile(program.file, function(err, data) {
      if(err) {
        throw new Error(err);
      }
      callback(null, JSON.parse(data));
    });
  },
  function(data, callback) {
    if(program.client) {
      for(var i = 0; i < data.length; ++i) {
        var c = data[i];
        console.log('    {code:\'%s\', name:\'%s\'},',
          c['alpha-2'],
          c.name.replace('\'','\\\''));
      }
    }
    callback(null, data);
  },
  function(data, callback) {
    if(program.payflow) {
      for(var i = 0; i < data.length; ++i) {
        var c = data[i];
        console.log('  \'%s\': \'%s\', // %s',
          c['alpha-2'],
          c['country-code'],
          c.name.replace('\'','\\\''));
      }
    }
    callback(null, data);
  },
  function(data, callback) {
    if(program.schemas) {
      for(var i = 0; i < data.length; ++i) {
        var c = data[i];
        console.log('        \'%s\', // %s',
          c['alpha-2'],
          c.name.replace('\'','\\\''));
      }
    }
    callback(null, data);
  }
]);
