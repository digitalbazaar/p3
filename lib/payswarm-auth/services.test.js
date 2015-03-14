/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */

/*
WARNING: Do not let this run in production mode.
*/

var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var brValidation = require('bedrock-validation');
var payswarm = {
  logger: bedrock.loggers.get('app'),
  services: {
    identity: require('./services.identity')
  },
  tools: require('./tools')
};
var BedrockError = payswarm.tools.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.test';
api.namespace = MODULE_NS;
module.exports = api;

// test distributed ID generator
var testIdGenerators = [];

// add services
bedrock.events.on('bedrock-express.configure.routes', addServices);

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  // create an array of test id generators
  var generators = 2;
  var count = 0;
  async.whilst(
    function() { return count < generators; },
    function(callback) {
      count++;
      brDatabase.getDistributedIdGenerator('test' + count,
        function(err, idGenerator) {
          if(!err) {
            testIdGenerators.push(idGenerator);
          }
          callback(err);
      });
    },
    callback);
});

/**
 * Adds web services to the server.
 *
 * @param app the bedrock application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  app.get('/test/ping',
    function(req, res) {
      res.send('pong');
    });

  app.post('/test/profile/create',
    validate('services.test.postProfileCreate'),
    function(req, res, next) {
      var options = {
        account: {
          // default to lots of test money
          balance: req.param('balance', '1000')
        }
      };
      async.waterfall([
        function(callback) {
          payswarm.services.identity._createIdentity(options, req, callback);
        },
        function(details, callback) {
          // skip if no key
          if(!('sysPublicKey' in req.body)) {
            return callback(null, details);
          }

          // build public key
          var key = payswarm.tools.clone(req.body.sysPublicKey);
          key.owner = details.identity.id;
          // copy main context if custom context not present
          if(!('@context' in key)) {
            key['@context'] = req.body['@context'];
          }

          // add public key
          // FIXME: run validator on key
          brIdentity.addIdentityPublicKey(
            {id: details.profile.id}, key, function(err, record) {
              if(err) {
                return next(new BedrockError(
                  'The public key could not be added.',
                  MODULE_NS + '.AddPublicKeyFailed', {
                    'public': true
                  }, err));
              }
              // return key
              details.sysPublicKey = record.publicKey;
              callback(null, details);
            });
        },
        function(details, callback) {
          // add address
          // FIXME: run validator on address
          brIdentity.addIdentityAddress(
            {id: details.profile.id}, details.identity.id, {
              type: 'Address',
              label: 'Home',
              name: 'Test User',
              streetAddress: '100 Street Apt 1',
              addressLocality: 'City',
              addressRegion: 'State',
              postalCode: '10000',
              addressCountry: 'US',
              sysValidated: false
            }, function(err) {
              callback(err, details);
            });
        },
        function(details, callback) {
          res.status(201).json(details);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
      });
    });

  app.post('/test/ids/create',
    validate({query: 'services.test.postIdsCreateQuery'}),
    function(req, res, next) {
      // default to sync generation of 1 id in first generator
      var generator = parseInt(req.param('generator', '0'), 10);
      var count = parseInt(req.param('count', '1'), 10);
      var wait = req.param('wait', 'true') === 'true';
      var concurrency = parseInt(req.param('concurrency', '1'), 10);

      var done = 0;
      var lastId = null;
      var start = +new Date();

      var q = async.queue(function(task, callback) {
        testIdGenerators[generator].generateId(function(err, id) {
          lastId = id;
          if(err) {
            console.log('IDS GEN ERROR', err);
            if(wait) {
              res.status(500).send('');
            }
            return callback(err);
          }
          done++;
          callback(null);
        });
      }, concurrency);

      q.drain = function() {
        if(wait) {
          // send respsonse when done
          if(done === count) {
            var dt = (+new Date() - start) / 1000;
            res.json({
              count: count,
              dt: dt,
              idsPerSec: count / dt,
              lastId: lastId
            });
          }
        }
      };

      // queue lots of generation tasks
      var task = {};
      for(var i = 0; i < count; i++) {
        q.push(task);
      }

      // if not waiting, return immediately
      if(!wait) {
        res.status(200).send('');
      }
    });

  callback(null);
}
