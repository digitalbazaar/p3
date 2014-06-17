/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  docs: require('./docs'),
  db: bedrock.modules['bedrock.database'],
  financial: require('./financial'),
  identity: require('./identity'),
  logger: bedrock.loggers.get('app'),
  profile: require('./profile'),
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
var validate = payswarm.validation.validate;

// constants
var MODULE_TYPE = payswarm.website.type;
var MODULE_IRI = payswarm.website.iri;

// sub module API
var api = {};
module.exports = api;

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
  // FIXME: Re-enable documentation when service goes public
  //payswarm.docs.annotate.post(
  //  '/i/:identity/budgets', 'services.budget.postBudgets');
  app.server.post('/i/:identity/budgets',
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
            req.user.profile, req.body.source, callback);
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
          payswarm.financial.createBudget(req.user.profile, budget, callback);
        },
        function(record, callback) {
          // add vendor
          if(vendor) {
            return payswarm.financial.addBudgetVendor(
              req.user.profile, budget.id, vendor, callback);
          }
          callback();
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        // return budget
        res.set('Location', budget.id);
        res.json(201, budget);
      });
  });

  app.server.get('/i/:identity/budgets', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var id = payswarm.identity.createIdentityId(req.params.identity);
      payswarm.financial.getIdentityBudgets(
        req.user.profile, id, function(err, records) {
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

  app.server.post('/i/:identity/budgets/:budget',
    ensureAuthenticated,
    validate('services.budget.postBudget'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var budgetId = payswarm.financial.createBudgetId(
        identityId, req.params.budget);

      // setup budget changes
      var changes = payswarm.tools.clone(req.body);
      changes.id = budgetId;

      // do update
      async.waterfall([
        function(callback) {
          payswarm.financial.updateBudget(
            req.user.profile, changes, callback);
        },
        function(callback) {
          // add vendor
          if(req.body.vendor) {
            return payswarm.financial.addBudgetVendor(
              req.user.profile, budgetId, req.body.vendor,
              callback);
          }
          callback();
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
  });

  app.server.get('/i/:identity/budgets/:budget', ensureAuthenticated,
    validate({query: 'services.budget.getBudgetQuery'}),
    function(req, res, next) {
      if(req.query.view === 'vendors') {
        return _getBudgetVendors(req, res, next);
      }

      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var budgetId = payswarm.financial.createBudgetId(
        identityId, req.params.budget);

      async.waterfall([
        function(callback) {
          payswarm.financial.getBudget(
            req.user.profile, budgetId, callback);
        },
        function(budget, meta, callback) {
          function ldjson() {
            res.json(budget);
          }
          res.format({
            'application/ld+json': ldjson,
            json: ldjson,
            html: function() {
              payswarm.identity.getIdentity(
                req.user.profile, identityId, function(err, identity) {
                  if(err) {
                    return next(err);
                  }
                  payswarm.website.getDefaultViewVars(req, function(err, vars) {
                    if(err) {
                      return next(err);
                    }
                    vars.budget = budget;
                    vars.identity = identity;
                    vars.clientData.budgetId = budgetId;
                    res.render('budget.html', vars);
                  });
                });
            }
          });
        }
      ], function(err) {
        if(err) {
          next(err);
        }
      });
  });

  // FIXME: Re-enable documentation when service goes public
  //payswarm.docs.annotate.del(
  //  '/i/:identity/budgets/:budget', 'services.budget.deleteBudget');
  app.server.del('/i/:identity/budgets/:budget', ensureAuthenticated,
    validate({query: 'services.budget.delBudgetQuery'}),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var budgetId = payswarm.financial.createBudgetId(
        identityId, req.params.budget);

      // only remove vendor
      if(req.query.vendor) {
        return payswarm.financial.removeBudgetVendor(
          req.user.profile, budgetId, req.query.vendor, function(err) {
            if(err) {
              return next(err);
            }
            res.send(204);
          });
      }

      // remove entire budget
      payswarm.financial.removeBudget(
        req.user.profile, budgetId, function(err) {
          if(err) {
            return next(err);
          }
          res.send(204);
        });
  });

  callback(null);
}

function _getBudgetVendors(req, res, next) {
  // get IDs from URL
  var identityId = payswarm.identity.createIdentityId(req.params.identity);
  var budgetId = payswarm.financial.createBudgetId(
    identityId, req.params.budget);

  async.waterfall([
    function(callback) {
      payswarm.financial.getBudget(
        req.user.profile, budgetId, callback);
    },
    function(budget, meta, callback) {
      // FIXME: place limit and do pagination/continuation on vendors
      // build db hashes for each vendor
      var vendors = [];
      async.forEach(budget.vendor, function(vendor, callback) {
        process.nextTick(function() {
          vendors.push(payswarm.db.hash(vendor));
          callback();
        });
      }, function(err) {
        if(err) {
          return callback(err);
        }
        // get all identities for the budget
        payswarm.identity.getIdentities(
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
        record.identity.psaPublic.forEach(function(field) {
          vendor[field] = record.identity[field];
        });
        vendors.push(vendor);
      });

      // return vendors
      function ldjson() {
        res.json(vendors);
      }
      res.format({
        'application/ld+json': ldjson,
        json: ldjson
      });
    }
  ], function(err) {
    if(err) {
      next(err);
    }
  });
}
