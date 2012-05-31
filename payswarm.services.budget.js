/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  profile: require('./payswarm.profile'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;

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
  app.server.post('/i/:identity/budgets', ensureAuthenticated,
    function(req, res, next) {
      var budget = {};
      async.waterfall([
        function(callback) {
          // get identity from account
          // FIXME: change to com:source
          payswarm.financial.getAccount(
            req.user.profile, req.body['com:account'], callback);
        },
        function(account, meta, callback) {
          callback(null, account['ps:owner']);
        },
        function(identityId, callback) {
          // create budget ID
          budget['ps:owner'] = identityId;
          payswarm.financial.generateBudgetId(identityId, callback);
        },
        function(budgetId, callback) {
          budget['@id'] = budgetId;
          budget['rdfs:label'] = req.body['rdfs:label'];
          budget['com:account'] = req.body['com:account'];
          budget['com:amount'] = req.body['com:amount'];
          if('psa:maxPerUse' in req.body) {
            budget['psa:maxPerUse'] = req.body['psa:maxPerUse'];
          }
          budget['psa:refresh'] = req.body['psa:refresh'];
          budget['psa:expires'] = req.body['psa:expires'];

          // add budget
          payswarm.financial.createBudget(req.user.profile, budget, callback);
        },
        function(record, callback) {
          // add vendor
          if(req.body['com:vendor']) {
            return payswarm.financial.addBudgetVendor(
              req.user.profile, budget['@id'], req.body['com:vendor'],
              callback);
          }
          callback();
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        // return budget
        res.json(budget, {'Location': budget['@id']}, 201);
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

  app.server.post('/i/:identity/budgets/:budget', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var budgetId = payswarm.financial.createBudgetId(
        identityId, req.params.budget);

      // setup budget changes
      var changes = payswarm.tools.clone(req.body);
      changes['@id'] = budgetId;

      // clear expires if empty
      if('psa:expires' in changes && changes['psa:expires'] === '') {
        delete changes['psa:expires'];
      }

      // do update
      async.waterfall([
        function(callback) {
          payswarm.financial.updateBudget(
            req.user.profile, changes, callback);
        },
        function(callback) {
          // add vendor
          if(req.body['com:vendor']) {
            return payswarm.financial.addBudgetVendor(
              req.user.profile, budget['@id'], req.body['com:vendor'],
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
                  vars['budget'] = budget;
                  vars['identity'] = identity;
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
