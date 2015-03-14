/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var brRest = require('bedrock-rest');
var brValidation = require('bedrock-validation');
var payswarm = {
  constants: bedrock.config.constants,
  financial: require('./financial'),
  logger: bedrock.loggers.get('app'),
  money: require('./money'),
  tools: require('./tools')
};
var Money = payswarm.money.Money;
var BedrockError = payswarm.tools.BedrockError;
var validate = brValidation.validate;

// constants
var MODULE_NS = 'payswarm.services';

// module API
var api = {};
api.name = MODULE_NS + '.account';
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

  app.post('/i/:identity/accounts',
    ensureAuthenticated,
    validate('services.account.postAccounts'),
    function(req, res, next) {
      // get identity ID from URL, account ID from posted slug
      var identityId = brIdentity.createIdentityId(req.params.identity);
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

  app.get('/i/:identity/accounts',
    ensureAuthenticated,
    brRest.makeResourceHandler({
      get: function(req, res, callback) {
        // get identity ID from URL
        var id = brIdentity.createIdentityId(req.params.identity);

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

  app.post('/i/:identity/accounts/:account',
    ensureAuthenticated,
    validate('services.account.postAccount'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
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

  app.delete('/i/:identity/accounts/:account',
    ensureAuthenticated,
    validate({query: 'services.account.delAccountQuery'}),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
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

  app.post('/i/:identity/accounts/:account/credit-line',
    ensureAuthenticated,
    validate('services.account.postAccountCreditLine'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      if(req.body.id !== accountId) {
        return next(new BedrockError(
          'Resource and content id mismatch.',
          MODULE_NS + '.IdMismatch', {
            httpStatusCode: 400,
            'public': true
          }));
      }

      // assume creation of free account credit line
      var options = {};
      options.amount = new Money(
        bedrock.config.financial.account.freeCreditLineAmount);

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

  app.post('/i/:identity/accounts/:account/backup-source',
    ensureAuthenticated,
    validate('services.account.postAccountBackupSource'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
      var accountId = payswarm.financial.createAccountId(
        identityId, req.params.account);

      if(req.body.id !== accountId) {
        return next(new BedrockError(
          'Resource and content id mismatch.',
          MODULE_NS + '.IdMismatch', {
            httpStatusCode: 400,
            'public': true
          }));
      }

      payswarm.financial.addAccountBackupSource(
        req.user.identity, accountId, req.body.backupSource, function(err) {
          if(err) {
            return next(err);
          }
          res.send(204);
        });
    });

  app.post('/i/:identity/accounts/:account/badge',
    ensureAuthenticated,
    validate('services.account.postAccountBadge'),
    function(req, res, next) {
      // get IDs from URL
      var identityId = brIdentity.createIdentityId(req.params.identity);
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

  app.get('/i/:identity/accounts/:account',
    brRest.makeResourceHandler({
      get: function(req, res, callback) {
        // get IDs from URL
        var identityId = brIdentity.createIdentityId(
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
                }));
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
                }));
            }

            // FIXME:
            cleanedAccount['@context'] =
              payswarm.constants.PAYSWARM_CONTEXT_V1_URL;

            callback(null, cleanedAccount);
          }
        ], function(err, account) {
          if(err) {
            return callback(err);
          }
          callback(null, account);
        });
      }
    }));

  app.post('/i/:identity/regulatory-address', ensureAuthenticated,
    validate('services.account.postRegulatoryAddress'),
    function(req, res, next) {
      var address = req.body.address;
      delete address['@context'];
      var account = req.body.account;
      if(account) {
        delete account['@context'];
      }
      payswarm.financial.setIdentityRegulatoryAddress(
        req.user.identity, {
          id: brIdentity.createIdentityId(req.params.identity),
          address: address,
          account: account
        }, function(err) {
          if(err) {
            err = new BedrockError(
              'The regulatory address could not be set.',
              MODULE_NS + '.SetRegulatoryAddressFailed', {public: true}, err);
            return next(err);
          }
          res.send(201);
        });
  });

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
      account['@context'] = payswarm.constants.PAYSWARM_CONTEXT_V1_URL;
      cleanedAccount = account;
    } else if('sysPublic' in account && account.sysPublic.length > 0) {
      cleanedAccount = {
        '@context': payswarm.constants.PAYSWARM_CONTEXT_V1_URL,
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
