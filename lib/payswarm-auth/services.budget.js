/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brDocs = require('bedrock-docs');
var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var brRest = require('bedrock-rest');
var brValidation = require('bedrock-validation');
var payswarm = {
  financial: require('./financial'),
  logger: bedrock.loggers.get('app'),
  tools: require('./tools')
};
var BedrockError = bedrock.util.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.budget';
api.namespace = MODULE_NS;
module.exports = api;

// add services
bedrock.events.on('bedrock-express.configure.routes', addServices);

/**
 * Adds web services to the server.
 *
 * @param app the bedrock application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = brPassport.ensureAuthenticated;

  // FIXME: Re-enable documentation when service goes public
  //brDocs.annotate.post(
  //  '/i/:identity/budgets', 'services.budget.postBudgets');
  app.post('/i/:identity/budgets',
    ensureAuthenticated,
    validate('services.budget.postBudgets'),
    function(req, res, next) {
      var budget = req.body;
      // save optional vendor
      var vendor = req.body.vendor;
      delete req.body.vendor;

      async.waterfall([
        function(callback) {
          // get identity from account
          payswarm.financial.getAccount(
            req.user.identity, req.body.source, callback);
        },
        function(account, meta, callback) {
          callback(null, account.owner);
        },
        function(identityId, callback) {
          // create budget ID
          budget.owner = identityId;
          payswarm.financial.generateBudgetId(identityId, callback);
        },
        function(budgetId, callback) {
          budget.id = budgetId;

          // add budget
          payswarm.financial.createBudget(req.user.identity, budget, callback);
        },
        function(record, callback) {
          // add vendor
          if(vendor) {
            return payswarm.financial.addBudgetVendor(
              req.user.identity, budget.id, vendor, callback);
          }
          callback();
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        // return budget
        res.set('Location', budget.id);
        res.status(201).json(budget);
      });
  });

  app.get('/i/:identity/budgets', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var id = brIdentity.createIdentityId(req.params.identity);
      payswarm.financial.getIdentityBudgets(
        req.user.identity, id, function(err, records) {
          if(err) {
            return next(err);
          }
          var budgets = [];
          records.forEach(function(record) {
            budgets.push(record.budget);
          });
          res.json(budgets);
        });
  });

  app.post('/i/:identity/budgets/:budget',
    ensureAuthenticated,
    validate('services.budget.postBudget'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var budgetId = payswarm.financial.createBudgetId(
        identityId, req.params.budget);

      // setup and validate changes
      var changes = bedrock.util.clone(req.body);
      if(changes.id !== budgetId) {
        return next(new BedrockError(
          'Resource and content id mismatch.',
          MODULE_NS + '.IdMismatch', {
            httpStatusCode: 400,
            'public': true
          }));
      }

      // do update
      async.waterfall([
        function(callback) {
          payswarm.financial.updateBudget(
            req.user.identity, changes, callback);
        },
        function(callback) {
          // add vendor
          if(req.body.vendor) {
            return payswarm.financial.addBudgetVendor(
              req.user.identity, budgetId, req.body.vendor,
              callback);
          }
          callback();
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.status(204).end();
      });
  });

  app.get('/i/:identity/budgets/:budget',
    ensureAuthenticated,
    validate({query: 'services.budget.getBudgetQuery'}),
    brRest.makeResourceHandler({
      get: function(req, res, callback) {
        if(req.query.view === 'vendors') {
          return _getBudgetVendors(req, res, callback);
        }

        // get IDs from URL
        var identityId = brIdentity.createIdentityId(
          req.params.identity);
        var budgetId = payswarm.financial.createBudgetId(
          identityId, req.params.budget);

        payswarm.financial.getBudget(
          req.user.identity, budgetId, function(err, budget, meta) {
            if(err) {
              return callback(err);
            }
            callback(null, budget);
          });
      }
    }));

  // FIXME: Re-enable documentation when service goes public
  //brDocs.annotate.del(
  //  '/i/:identity/budgets/:budget', 'services.budget.deleteBudget');
  app.delete('/i/:identity/budgets/:budget', ensureAuthenticated,
    validate({query: 'services.budget.delBudgetQuery'}),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var budgetId = payswarm.financial.createBudgetId(
        identityId, req.params.budget);

      // only remove vendor
      if(req.query.vendor) {
        return payswarm.financial.removeBudgetVendor(
          req.user.identity, budgetId, req.query.vendor, function(err) {
            if(err) {
              return next(err);
            }
            res.status(204).end();
          });
      }

      // remove entire budget
      payswarm.financial.removeBudget(
        req.user.identity, budgetId, function(err) {
          if(err) {
            return next(err);
          }
          res.status(204).end();
        });
  });

  callback(null);
}

function _getBudgetVendors(req, res, callback) {
  // get IDs from URL
  var identityId = brIdentity.createIdentityId(req.params.identity);
  var budgetId = payswarm.financial.createBudgetId(
    identityId, req.params.budget);

  async.waterfall([
    function(callback) {
      payswarm.financial.getBudget(req.user.identity, budgetId, callback);
    },
    function(budget, meta, callback) {
      // FIXME: place limit and do pagination/continuation on vendors
      // build db hashes for each vendor
      var vendors = [];
      async.each(budget.vendor, function(vendor, callback) {
        process.nextTick(function() {
          vendors.push(brDatabase.hash(vendor));
          callback();
        });
      }, function(err) {
        if(err) {
          return callback(err);
        }
        // get all identities for the budget
        brIdentity.getIdentities(
          null, {id: {$in: vendors}}, {'identity': true}, callback);
      });
    },
    function(records, callback) {
      // create vendor object for each record
      var vendors = [];
      records.forEach(function(record) {
        var vendor = {
          id: record.identity.id,
          type: record.identity.type
        };
        // add public fields
        record.identity.sysPublic.forEach(function(field) {
          vendor[field] = record.identity[field];
        });
        vendors.push(vendor);
      });

      callback(null, vendors);
    }
  ], function(err, vendors) {
    if(err) {
      return callback(err);
    }
    callback(null, vendors);
  });
}
