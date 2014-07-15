/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  financial: require('./financial'),
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  money: require('./money'),
  tools: require('./tools'),
  validation: bedrock.validation
};
var Money = payswarm.money.Money;
var BedrockError = payswarm.tools.BedrockError;
var validate = payswarm.validation.validate;

// constants
var MODULE_NS;

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
  payswarm.website = bedrock.modules['bedrock.website'];
  MODULE_NS = payswarm.website.namespace;
  addServices(app, callback);
};

/**
 * Adds web services to the server.
 *
 * @param app the payswarm-auth application.
 * @param callback(err) called once the services have been added to the server.
 */
function addServices(app, callback) {
  var ensureAuthenticated = payswarm.website.ensureAuthenticated;

  app.server.post('/i/:identity/accounts',
    ensureAuthenticated,
    validate('services.account.postAccounts'),
    function(req, res, next) {
      // get identity ID from URL, account ID from posted slug
      var identityId = payswarm.identity.createIdentityId(req.params.identity);
      var account = req.body;
      account.id = payswarm.financial.createAccountId(
        identityId, req.body.sysSlug);

      // set account details
      account.owner = identityId;

      // add account
      payswarm.financial.createAccount(
        req.user.identity, account, function(err, record) {
          if(err) {
            err = new BedrockError(
              'The account could not be added.',
              MODULE_NS + '.AddIdentityAccountFailed', {
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
    payswarm.website.makeResourceHandler({
      get: function(req, res, callback) {
        // get identity ID from URL
        var id = payswarm.identity.createIdentityId(req.params.identity);

        // return accounts
        payswarm.financial.getIdentityAccounts(
          req.user.identity, id, function(err, records) {
            if(err) {
              return callback(err);
            }
            // do not return deleted accounts
            var accounts = [];
            records.forEach(function(record) {
              var account = record.account;
              if(account.sysStatus !== 'deleted') {
                accounts.push(account);
              }
            });
            callback(err, accounts);
          });
      }
    }));

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
          payswarm.financial.getAccount(req.user.identity, accountId, callback);
        },
        function(account, meta, callback) {
          if(req.body.label) {
            account.label = req.body.label;
          }
          if(req.body.sysPublic) {
            account.sysPublic = req.body.sysPublic;
          }
          if('sysAllowInstantTransfer' in req.body) {
            account.sysAllowInstantTransfer = req.body.sysAllowInstantTransfer;
          }
          if('sysMinInstantTransfer' in req.body) {
            account.sysMinInstantTransfer = req.body.sysMinInstantTransfer;
          }
          // if sysAllowInstantTransfer true, must have sysMinInstantTransfer
          if(req.body.sysAllowInstantTransfer &&
            !('sysMinInstantTransfer' in req.body)) {
            account.sysMinInstantTransfer = Money.ZERO.toString();
          }
          // FIXME: only allow financial admins to set status
          /*if(req.body.sysStatus) {
            account.sysStatus = req.body.sysStatus;
          }*/

          // limit operations
          var opsLeft = 20;
          // recursive update backupSource
          var updateBackupSource = function(err, account) {
            if(err) {
              return callback(err);
            }
            var oldSources = account.backupSource || [];
            var newSources = req.body.backupSource || [];
            // check if done
            if(_.isEqual(oldSources, newSources)) {
              return callback(null);
            }
            // check ops limit
            opsLeft = opsLeft - 1;
            if(opsLeft === 0) {
              return callback(new BedrockError(
                'The account update failed.',
                MODULE_NS + '.AccountUpdateFailed', {
                  'public': true
                }));
            }
            // check if clearing all sources
            if(newSources.length === 0) {
              // start removing sources from the last position
              return payswarm.financial.removeAccountBackupSource(
                req.user.identity, accountId, oldSources[oldSources.length - 1],
                function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.identity, accountId, updateBackupSource);
                });
            }
            // check if only a reordering call is needed
            if(_.difference(newSources, oldSources).length === 0 &&
              _.difference(oldSources, newSources).length === 0) {
              var newAccount = {
                  id: accountId,
                  backupSource: newSources
              };
              return payswarm.financial.reorderAccountBackupSources(
                req.user.identity, newAccount, function(err) {
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
                req.user.identity, accountId, newSources[0], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.identity, accountId, updateBackupSource);
                });
            }
            if(newStart !== 0) {
              // new not at the start of the list
              // remove whatever was in the first position
              return payswarm.financial.removeAccountBackupSource(
                req.user.identity, accountId, oldSources[0], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.identity, accountId, updateBackupSource);
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
            if(oldSources.length > end) {
              return payswarm.financial.removeAccountBackupSource(
                req.user.identity, accountId, oldSources[end], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.identity, accountId, updateBackupSource);
                });
            }
            // add next new item if needed
            if(newSources.length > end) {
              return payswarm.financial.addAccountBackupSource(
                req.user.identity, accountId, newSources[end], function(err) {
                  if(err) {
                    return callback(err);
                  }
                  // reload and recurse
                  payswarm.financial.getAccount(
                    req.user.identity, accountId, updateBackupSource);
                });
            }
            // final reload and recurse make sure update is complete
            payswarm.financial.getAccount(
              req.user.identity, accountId, updateBackupSource);
          };

          // update account
          payswarm.financial.updateAccount(
            req.user.identity, account, function(err) {
              if(err) {
                return callback(err);
              }
              if(req.body.backupSource) {
                updateBackupSource(null, account);
              } else {
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
          req.user.identity, accountId, req.query.backupSource, function(err) {
            if(err) {
              return next(err);
            }
            res.send(204);
          });
      }

      // FIXME: add account "delete" support?
      res.send(500);
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
          // TODO: ensure identity may add a credit line to the
          // account (limit # of free credit lines by identity)
          callback();
        },
        function(callback) {
          payswarm.financial.createAccountCreditLine(
            req.user.identity, accountId, options, callback);
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
        req.user.identity, accountId, req.body.backupSource, function(err) {
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
            req.user.identity, accountId, options, callback);
        }
      ], function(err) {
        if(err) {
          return next(err);
        }
        res.send(204);
      });
  });

  app.server.get('/i/:identity/accounts/:account',
    payswarm.website.makeResourceHandler({
      get: function(req, res, callback) {
        // get IDs from URL
        var identityId = payswarm.identity.createIdentityId(
          req.params.identity);
        var accountId = payswarm.financial.createAccountId(
          identityId, req.params.account);

        async.waterfall([
          function(callback) {
            payswarm.financial.getAccount(null, accountId, callback);
          },
          function(account, meta, callback) {
            if(account.sysStatus === 'deleted') {
              // invalid account send 404
              return callback(new BedrockError(
                'The account was not found.',
                MODULE_NS + '.AccountNotFound', {
                  httpStatusCode: 404,
                  'public': true
                }, err));
            }
            var cleanedAccount = _cleanAccount(
              {identity: identityId}, req, account);
            if(!cleanedAccount) {
              // consider account not found
              return callback(new BedrockError(
                'The account was not found.',
                MODULE_NS + '.AccountNotFound', {
                  httpStatusCode: 404,
                  'public': true
                }, err));
            }

            // FIXME:
            cleanedAccount['@context'] = payswarm.constants.CONTEXT_URL;

            callback(null, cleanedAccount);
          }
        ], function(err, account) {
          if(err) {
            callback(err);
          }
          callback(null, account);
        });
      }
    }));

  callback(null);
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
      account['@context'] = payswarm.constants.CONTEXT_URL;
      cleanedAccount = account;
    } else if('sysPublic' in account && account.sysPublic.length > 0) {
      cleanedAccount = {
        '@context': payswarm.constants.CONTEXT_URL,
        id: account.id,
        type: account.type
      };
      for(var i = 0; i < account.sysPublic.length; i++) {
        var property = account.sysPublic[i];
        if(property in account) {
          cleanedAccount[property] = account[property];
        }
      }
    }
  }

  return cleanedAccount;
}
