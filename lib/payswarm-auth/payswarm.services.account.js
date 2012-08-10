/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.loggers').get('app'),
  tools: require('./payswarm.tools'),
  validation: require('./payswarm.validation'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
var validate = payswarm.validation.validate;
var getDefaultViewVars = payswarm.website.getDefaultViewVars;

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
  app.server.post('/i/:identity/accounts',
    ensureAuthenticated,
    validate('services.account.postAccounts'),
    function(req, res, next) {
      // get identity ID from URL, account ID from posted slug
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var account = {};
      account.id = payswarm.financial.createAccountId(
        identityId, req.body.psaSlug);

      // set account details
      account.owner = identityId;
      account.label = req.body.label;
      account.currency = req.body.currency;
      // FIXME: allow setting public privacy? default is private
      if(req.body.psaPublic) {
        account.psaPublic = req.body.psaPublic;
      }

      // add account
      payswarm.financial.createAccount(
        req.user.profile, account, function(err) {
          if(err) {
            err = new PaySwarmError(
              'The account could not be added.',
              MODULE_TYPE + '.AddIdentityAccountFailed', {
                'public': true,
              }, err);
            return next(err);
          }
          // return account
          res.set('Location', account.id);
          res.json(201, account);
        });
  });

  app.server.get('/i/:identity/accounts',
    ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var id = payswarm.identity.createIdentityId(req.params.identity);

      // show all transaction activity for identity
      if(req.query.view === 'activity') {
        return _getTransactionActivity({identity: id}, req, res, next);
      }

      // return accounts
      payswarm.financial.getIdentityAccounts(
        req.user.profile, id, function(err, records) {
          if(err) {
            return next(err);
          }
          // do not return deleted accounts
          var accounts = [];
          records.forEach(function(record) {
            var account = record.account;
            if(account.psaStatus !== 'deleted') {
              accounts.push(account);
            }
          });
          res.json(accounts);
        });
  });

  app.server.post('/i/:identity/accounts/:account',
    ensureAuthenticated,
    validate('services.account.postAccount'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      async.waterfall([
        function(callback) {
          // get account for ownership check
          payswarm.financial.getAccount(req.user.profile, accountId, callback);
        },
        function(account, meta, callback) {
          if(req.body.label) {
            account.label = req.body.label;
          }
          if(req.body.psaPublic) {
            account.psaPublic = req.body.psaPublic;
          }
          if(req.body.psaStatus) {
            // FIXME: only allow financial admins to set status?
            account.psaStatus = req.body.psaStatus;
          }
          // update account
          payswarm.financial.updateAccount(
            req.user.profile, account, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send();
      });
  });

  app.server.get('/i/:identity/accounts/:account',
    ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      // show all transaction activity for account
      if(req.query.view === 'activity') {
        return _getTransactionActivity(
          {identity: identityId, account: accountId}, req, res, next);
      }

      async.waterfall([
        function(callback) {
          payswarm.financial.getAccount(
            req.user.profile, accountId, callback);
        },
        function(account, meta, callback) {
          if(account.psaStatus === 'deleted') {
            // invalid account send 404
            return res.send(404);
          }
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
                  vars.account = account;
                  vars.identity = identity;
                  res.render('financial/account.tpl', vars);
                });
              });
          }*/
          // return account
          res.json(account);
        }
      ], function(err) {
        if(err) {
          next(err);
        }
      });
  });

  callback(null);
}

/**
 * Handles a request to get a view of Transaction activity.
 *
 * @param options the options to use.
 *          identity: the identity to get activity for.
 *          [account]: the account to get activity for.
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getTransactionActivity(options, req, res, next) {
  // FIXME: profile has no default identity, this is an error,
  // go to a page where they can create an identity
  if(!req.user.identity) {
    return res.redirect('/profile/settings');
  }

  async.auto({
    getAccount: function(callback) {
      if(options.account) {
        return payswarm.financial.getAccount(
          req.user.profile, options.account, function(err, account) {
            callback(err, account);
          });
      }
      callback(null, null);
    },
    getVars: function(callback) {
      getDefaultViewVars(req, callback);
    },
    render: ['getAccount', 'getVars', function(callback, results) {
      var vars = results.getVars;
      vars.clientData.identity = options.identity;
      vars.clientData.account = results.getAccount || null;
      res.render('transactions.tpl', vars);
    }]
  }, function(err) {
    if(err) {
      next(err);
    }
  });
}
