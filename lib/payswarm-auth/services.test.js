/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */

/*
WARNING: Do not let this run in production mode.
*/

var async = require('async');
var payswarm = {
  db: require('./database'),
  logger: require('./loggers').get('app'),
  identity: require('./identity'),
  services: {
    profile: require('./services.profile')
  },
  tools: require('./tools'),
  validation: require('./validation'),
};
var validate = payswarm.validation.validate;

// sub module API
var api = {};
module.exports = api;

// test distributed ID generator
var testIdGenerators = [];

/**
 * Initializes this module.
 *
 * @param app the application to initialize this module for.
 * @param callback(err) called once the operation completes.
 */
api.init = function(app, callback) {
  // do initialization work
  async.waterfall([
    function(callback) {
      // create an array of test id generators
      var generators = 2;
      var count = 0;
      async.whilst(
        function() { return count < generators; },
        function(callback) {
          count++;
          payswarm.db.getDistributedIdGenerator('test' + count,
            function(err, idGenerator) {
              if(!err) {
                testIdGenerators.push(idGenerator);
              }
              callback(err);
          });
        },
        callback);
    },
    function(callback) {
      addServices(app, callback);
    }
  ], callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  app.server.get('/test/ping',
    function(req, res) {
      res.send('pong');
    });

  app.server.post('/test/profile/create',
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
          payswarm.services.profile._createProfile(options, req, callback);
        },
        function(details, callback) {
          // skip if no key
          if(!('psaPublicKey' in req.body)) {
            return callback(null, details);
          }

          // build public key
          var key = payswarm.tools.clone(req.body.psaPublicKey);
          key.owner = details.identity.id;

          // add public key
          payswarm.identity.addIdentityPublicKey(
            {id: details.profile.id}, key, function(err, record) {
              if(err) {
                return next(new PaySwarmError(
                  'The public key could not be added.',
                  MODULE_TYPE + '.AddPublicKeyFailed', {
                    'public': true
                  }, err));
              }
              // return key
              details.psaPublicKey = record.publicKey;
              callback(null, details);
            });
        },
        function(details, callback) {
          // add address
          payswarm.identity.addIdentityAddress(
            {id: details.profile.id}, details.identity.id, {
              type: 'vcard:Address',
              label: 'Home',
              fullName: 'Test User',
              streetAddress: '100 Street Apt 1',
              locality: 'City',
              region: 'State',
              postalCode: '10000',
              countryName: 'US',
              psaValidated: false
            }, function(err) {
              callback(err, details);
            });
        },
        function(details, callback) {
          res.json(201, details);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
      });
    });

  app.server.post('/test/ids/create',
    validate({query: 'services.test.postIdsCreateQuery'}),
    function(req, res, next) {
      // default to sync generation of 1 id in first generator
      var generator = parseInt(req.param('generator', '0'));
      var count = parseInt(req.param('count', '1'));
      var wait = req.param('wait', 'true') === 'true';
      var concurrency = parseInt(req.param('concurrency', '1'));

      var done = 0;
      var lastid = null;

      var q = async.queue(function(task, callback) {
        testIdGenerators[generator].generateId(function(err, id) {
          //console.log('IDS GEN', err, id, done);
          lastid = id;
          if(err) {
            console.log('IDS GEN ERROR', err);
            if(wait) {
              res.send(500, '');
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
          //console.log('IDS DRAIN');
          if(done === count) {
            res.send(200, '');
          }
        };
        console.log('IDS LAST', lastid);
      };

      // queue lots of generation tasks
      for(var i = 0; i < count; i++) {
        q.push({});
      }

      // if not waiting, return immediately
      if(!wait) {
        res.send(200, '');
      }
    });

  callback(null);
}
