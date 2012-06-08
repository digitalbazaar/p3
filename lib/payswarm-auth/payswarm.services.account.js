/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../../payswarm.config'),
  db: require('./payswarm.database'),
  financial: require('./payswarm.financial'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  tools: require('./payswarm.tools'),
  website: require('./payswarm.website')
};
var PaySwarmError = payswarm.tools.PaySwarmError;
var ensureAuthenticated = payswarm.website.ensureAuthenticated;
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
  app.server.post('/i/:identity/accounts', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL, account ID from posted slug
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var account = {};
      account['@id'] = payswarm.financial.createAccountId(
        identityId, req.body['psa:slug']);

      // set account details
      account['ps:owner'] = identityId;
      account['rdfs:label'] = req.body['rdfs:label'];
      account['com:currency'] = req.body['com:currency'];
      // FIXME: allow setting privacy? default is private
      if(req.body['psa:privacy']) {
        account['psa:privacy'] = req.body['psa:privacy'];
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
          res.json(account, {'Location': account['@id']}, 201);
        });
  });

  app.server.get('/i/:identity/accounts', ensureAuthenticated,
    function(req, res, next) {
      // get identity ID from URL
      var id = payswarm.identity.createIdentityId(req.params.identity);
      payswarm.financial.getIdentityAccounts(
        req.user.profile, id, function(err, records) {
          if(err) {
            return next(err);
          }
          // do not return deleted accounts
          var accounts = [];
          for(var i in records) {
            var account = records[i].account;
            if(account['psa:status'] !== 'deleted') {
              accounts.push(account);
            }
          }
          res.json(accounts);
        });
  });

  app.server.post('/i/:identity/accounts/:account', ensureAuthenticated,
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
          if(req.body['rdfs:label']) {
            account['rdfs:label'] = req.body['rdfs:label'];
          }
          if(req.body['psa:privacy']) {
            account['psa:privacy'] = req.body['psa:privacy'];
          }
          if(req.body['psa:status']) {
            // FIXME: only allow financial admins to set status?
            account['psa:status'] = req.body['psa:status'];
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

  app.server.get('/i/:identity/accounts/:account', ensureAuthenticated,
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      async.waterfall([
        function(callback) {
          payswarm.financial.getAccount(
            req.user.profile, accountId, callback);
        },
        function(account, meta, callback) {
          if(account['psa:status'] === 'deleted') {
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
                  vars['account'] = account;
                  vars['identity'] = identity;
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
