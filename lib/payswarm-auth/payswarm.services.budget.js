/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  docs: require('./payswarm.docs'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  profile: require('./payswarm.profile'),
  tools: require('./payswarm.tools'),
  validation: require('./payswarm.validation'),
  website: require('./payswarm.website')
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
  payswarm.docs.annotate.post(
    '/i/:identity/budgets', 'services.budget.postBudgets');
  app.server.post('/i/:identity/budgets',
    ensureAuthenticated,
    validate('services.budget.postBudgets'),
    function(req, res, next) {
      var budget = {};
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
          budget.label = req.body.label;
          budget.source = req.body.source;
          budget.amount = req.body.amount;
          if('psaMaxPerUse' in req.body) {
            budget.psaMaxPerUse = req.body.psaMaxPerUse;
          }
          budget.psaRefresh = req.body.psaRefresh;
          budget.psaExpires = req.body.psaExpires;

          // add budget
          payswarm.financial.createBudget(req.user.profile, budget, callback);
        },
        function(record, callback) {
          // add vendor
          if(req.body.vendor) {
            return payswarm.financial.addBudgetVendor(
              req.user.profile, budget.id, req.body.vendor,
              callback);
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
          for(var i in records) {
            budgets.push(records[i].budget);
          }
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

      // clear expires if empty
      if('psaExpires' in changes && changes.psaExpires === '') {
        delete changes.psaExpires;
      }

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
        res.send();
      });
  });

  app.server.get('/i/:identity/budgets/:budget', ensureAuthenticated,
    function(req, res, next) {
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
          // return html form
          /* Note: Not currently used.
          if(req.query.form === 'edit') {
            return payswarm.identity.getIdentity(
              req.user.profile, identityId, function(err, identity) {
                if(err) {
                  return next(err);
                }
                getDefaultViewVars(req, function(err, vars) {
                  if(err) {
                    return next(err);
                  }
                  vars.budget = budget;
                  vars.identity = identity;
                  res.render('budget.tpl', vars);
                });
              });
          }*/
          // return budget
          res.json(budget);
        }
      ], function(err) {
        if(err) {
          next(err);
        }
      });
  });

  payswarm.docs.annotate.del(
      '/i/:identity/budgets/:budget', 'services.budget.deleteBudget');
  app.server.del('/i/:identity/budgets/:budget', ensureAuthenticated,
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
            res.send();
          });
      }

      // remove entire budget
      payswarm.financial.removeBudget(
        req.user.profile, budgetId, function(err) {
          if(err) {
            return next(err);
          }
          res.send();
        });
  });

  callback(null);
}
