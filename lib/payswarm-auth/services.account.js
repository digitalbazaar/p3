/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  money: require('./money'),
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
};
var Money = payswarm.money.Money;
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
      var account = req.body;
      account.id = payswarm.financial.createAccountId(
        identityId, req.body.psaSlug);

      // set account details
      account.owner = identityId;

      // add account
      payswarm.financial.createAccount(
        req.user.profile, account, function(err, record) {
          if(err) {
            err = new PaySwarmError(
              'The account could not be added.',
              MODULE_TYPE + '.AddIdentityAccountFailed', {
                'public': true
              }, err);
            return next(err);
          }
          // return account
          res.set('Location', record.account.id);
          res.json(201, record.account);
        });
  });

  app.server.get('/i/:identity/accounts',
    ensureAuthenticated,
    validate({query: 'services.account.getAccountsQuery'}),
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
          // FIXME: only allow financial admins to set status
          /*if(req.body.psaStatus) {
            account.psaStatus = req.body.psaStatus;
          }*/

          // limit operations
          var opsLeft = 20;
          // recursive update backupSource
          var updateBackupSource = function(err, account) {
            if(err) {
              return callback(err);
            }
            var oldSources = account.backupSource;
            var newSources = req.body.backupSource;
            // check if done
            if(_.isEqual(oldSources, newSources)) {
              return callback(null);
            }
            // check ops limit
            opsLeft = opsLeft - 1;
            if(opsLeft === 0) {
              return callback(new PaySwarmError(
                'The account update failed.',
                MODULE_TYPE + '.AccountUpdateFailed', {
                  'public': true
                }));
            }
            // check if only a reordering call is needed
            if(_.difference(newSources, oldSources).length === 0 &&
              _.difference(oldSources, newSources).length === 0) {
              var newAccount = {
                  id: accountId,
                  backupSource: newSources
              };
              return payswarm.financial.reorderAccountBackupSources(
                req.user.profile, newAccount, function(err) {
                  if(err) {
                    return callback(err);
                  }
                  callback(null);
                });
            }
            // find first of new sources
            // need to always have one source, so ensure at least the first of
            // the new sources is present
            var newStart = oldSources.indexOf(newSources[0]);
            if(newStart === -1) {
              // none of new are present, add first one
              return payswarm.financial.addAccountBackupSource(
                req.user.profile, accountId, newSources[0], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.profile, accountId, updateBackupSource);
                });
            }
            if(newStart !== 0) {
              // new not at the start of the list
              // remove whatever was in the first position
              return payswarm.financial.removeAccountBackupSource(
                req.user.profile, accountId, oldSources[0], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.profile, accountId, updateBackupSource);
                });
            }
            // find end of matching sequence
            var end = 0;
            while(end < oldSources.length &&
              end < newSources.length &&
              oldSources[end] === newSources[end]) {
              ++end;
            }
            // remove next old item if needed
            if(end < newSources.length && end < oldSources.length) {
              return payswarm.financial.removeAccountBackupSource(
                req.user.profile, accountId, oldSources[end], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.profile, accountId, updateBackupSource);
                });
            }
            // add next new item if needed
            if(end < newSources.length) {
              return payswarm.financial.addAccountBackupSource(
                req.user.profile, accountId, newSources[end], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.profile, accountId, updateBackupSource);
                });
            }
            // final reload and recurse make sure update is complete
            payswarm.financial.getAccount(
              req.user.profile, accountId, updateBackupSource);
          };

          // update account
          payswarm.financial.updateAccount(
            req.user.profile, account, function(err) {
              if(err) {
                return callback(err);
              }
              if(req.body.backupSource) {
                updateBackupSource(null, account);
              }
              else {
                callback(null);
              }
            });
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
  });

  app.server.del('/i/:identity/accounts/:account',
    ensureAuthenticated,
    validate({query: 'services.account.delAccountQuery'}),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      if(req.query.backupSource) {
        return payswarm.financial.removeAccountBackupSource(
          req.user.profile, accountId, req.query.backupSource, function(err) {
            if(err) {
              return next(err);
            }
            res.send(204);
          });
      }

      // FIXME: add account "delete" support?
      res.send(500);
  });

  app.server.post('/i/:identity/accounts/:account/instant-transfer',
    ensureAuthenticated,
    validate('services.account.postAccountInstantTransfer'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      async.waterfall([
        function(callback) {
          var options = {};
          if('psaAllowInstantTransfer' in req.body) {
            options.enable = req.body.psaAllowInstantTransfer;
          }
          if('psaMinInstantTransfer' in req.body) {
            options.minAmount = new Money(req.body.psaMinInstantTransfer);
          }
          if('backupSource' in req.body) {
            options.backupSource = req.body.backupSource;
          }
          // update account instant transfer feature
          payswarm.financial.updateAccountInstantTransfer(
            req.user.profile, accountId, options, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
  });

  app.server.post('/i/:identity/accounts/:account/credit-line',
    ensureAuthenticated,
    validate('services.account.postAccountCreditLine'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      // assume creation of free account credit line
      var options = {};
      options.amount = new Money(
        payswarm.config.financial.account.freeCreditLineAmount);
      options.backupSource = req.body.backupSource;

      async.waterfall([
        function(callback) {
          // TODO: ensure profile/identity may add a credit line to the
          // account (limit # of free credit lines by profile/identity)
          callback();
        },
        function(callback) {
          payswarm.financial.createAccountCreditLine(
            req.user.profile, accountId, options, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
  });

  app.server.post('/i/:identity/accounts/:account/backup-source',
    ensureAuthenticated,
    validate('services.account.postAccountBackupSource'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      payswarm.financial.addAccountBackupSource(
        req.user.profile, accountId, req.body.backupSource, function(err) {
          if(err) {
            return next(err);
          }
          res.send(204);
        });
    });

  app.server.post('/i/:identity/accounts/:account/badge',
    ensureAuthenticated,
    validate('services.account.postAccountBadge'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      async.waterfall([
        function(callback) {
          // input is a receipt for a purchased badge, posted here via
          // a purchase; badge may increase credit line amount, backed amount,
          // add backup source

          // TODO: look up badge by ID and get details
          callback(null, {});
        },
        function(badge, callback) {
          // TODO: confirm badge is for this account, etc.
          // TODO: confirm badge hasn't already been applied

          var options = {};
          if('amount' in badge) {
            options.amount = new Money(badge.amount);
          }
          if('backedAmount' in badge) {
            options.backedAmount = new Money(badge.backedAmount);
          }
          if('backupSource' in badge) {
            options.backupSource = badge.backupSource;
          }
          // update account credit line
          payswarm.financial.updateAccountCreditLine(
            req.user.profile, accountId, options, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
  });

  app.server.get('/i/:identity/accounts/:account',
    validate({query: 'services.account.getAccountQuery'}),
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
          payswarm.financial.getAccount(null, accountId, callback);
        },
        function(account, meta, callback) {
          if(account.psaStatus === 'deleted') {
            // invalid account send 404
            return next();
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
          var cleanedAccount =
            _cleanAccount({identity: identityId}, req, account);
          if(!cleanedAccount) {
            // consider account not found
            return next();
          }

          // FIXME:
          cleanedAccount['@context'] =
            payswarm.tools.getDefaultJsonLdContextUrl();

          var ldJsonOutput = function() {
            res.json(cleanedAccount);
          };
          res.format({
            'application/ld+json': ldJsonOutput,
            json: ldJsonOutput,
            html: function() {
              payswarm.website.getDefaultViewVars(req, function(err, vars) {
                if(err) {
                  return next(err);
                }
                vars.clientData.account = cleanedAccount;
                res.render('account.tpl', vars);
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
  async.auto({
    getAccount: function(callback) {
      if(options.account) {
        return payswarm.financial.getAccount(
          null, options.account, function(err, account) {
            callback(err, account);
          });
      }
      callback(null, null);
    },
    getVars: function(callback) {
      getDefaultViewVars(req, callback);
    },
    render: ['getAccount', 'getVars', function(callback, results) {
      var account = results.getAccount || null;
      if(account) {
        account = _cleanAccount({identity: options.identity}, req, account);
        if(!account) {
          // consider account not found
          return next();
        }
      }

      var vars = results.getVars;
      vars.clientData.identity = options.identity;
      vars.clientData.account = account;
      res.render('transactions.tpl', vars);
    }]
  }, function(err) {
    if(err) {
      next(err);
    }
  });
}

/**
 * Cleans account information for display based on the requestor and publicly
 * viewable options associated with the account.
 *
 * @param options the options to use.
 *          identity: the identity that is requesting info on the account.
 * @param req the request.
 * @param account the full account object.
 *
 * @return the cleaned account information, or null if the account is not
 *         viewable.
 */
function _cleanAccount(options, req, account) {
  var cleanedAccount = null;

  // generate the cleaned account based on the requesting identity
  if(account !== null) {
    if('user' in req &&
      req.user.identity.id == options.identity &&
      options.identity == account.owner) {
      // FIXME: this should be in the DB already
      account['@context'] = payswarm.tools.getDefaultJsonLdContextUrl();
      cleanedAccount = account;
    }
    else if('psaPublic' in account && account.psaPublic.length > 0) {
      cleanedAccount = {
        '@context': payswarm.tools.getDefaultJsonLdContextUrl(),
        id: account.id,
        type: account.type
      };
      for(var i = 0; i < account.psaPublic.length; i++) {
        var property = account.psaPublic[i];
        if(property in account) {
          cleanedAccount[property] = account[property];
        }
      }
    }
  }

  return cleanedAccount;
}
