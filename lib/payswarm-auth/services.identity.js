/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  config: bedrock.config,
  constants: bedrock.config.constants,
  db: bedrock.modules['bedrock.database'],
  financial: require('./financial'),
  identity: bedrock.modules['bedrock.identity'],
  logger: bedrock.loggers.get('app'),
  tools: require('./tools'),
  validation: bedrock.validation
};
var cors = require('cors');

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
  var getDefaultViewVars = payswarm.website.getDefaultViewVars;

  var idPath = bedrock.config.identity.basePath + '/:identity';

  app.server.get('/i/:identity/dashboard', ensureAuthenticated,
    function(req, res, next) {

      // FIXME: need a tie-in via bedrock to populate this for the dashboard
      /*
    checkUnbackedCreditEmails: function(callback) {
      payswarm.financial.isUnbackedCreditEmailAvailable(
        user.profile.email, function(err, available) {
          if(!err && available) {
            vars.session.profile.sysUnbackedCreditEmailAvailable = true;
          }
          callback();
        });
    }*/

      getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }

        // get identity based on URL
        var id = payswarm.identity.createIdentityId(req.params.identity);
        payswarm.identity.getIdentity(
          req.user.identity, id, function(err, identity) {
            if(err) {
              return next(err);
            }
            vars.identity = identity;
            vars.clientData.identity = id;
            res.render('dashboard.html', vars);
          });
      });
  });

  app.server.post(bedrock.config.identity.basePath,
    ensureAuthenticated,
    validate('services.identity.postIdentities'),
    function(req, res, next) {
      var identity = {};
      identity['@context'] = bedrock.config.constants.CONTEXT_URL;
      identity.id = payswarm.identity.createIdentityId(req.body.sysSlug);
      identity.type = req.body.type || 'PersonalIdentity';
      identity.sysSlug = req.body.sysSlug;
      identity.label = req.body.label;

      // conditional values only set if present
      if(req.body.description) {
        identity.description = req.body.description;
      }
      if(req.body.image) {
        identity.image = req.body.image;
      }
      if(req.body.sysImageType) {
        identity.sysImageType = req.body.sysImageType;
      }
      if(req.body.sysGravatarType) {
        identity.sysGravatarType = req.body.sysGravatarType;
      }
      if(req.body.url) {
        identity.url = req.body.url;
      }

      // add identity
      payswarm.identity.createIdentity(
        req.user.identity, identity, function(err) {
          if(err) {
            if(payswarm.db.isDuplicateError(err)) {
              return next(new BedrockError(
                'The identity is a duplicate and could not be added.',
                MODULE_NS + '.DuplicateIdentity', {
                  identity: identity.id,
                  httpStatusCode: 409,
                  'public': true
                }));
            }
            return next(new BedrockError(
              'The identity could not be added.',
              MODULE_NS + '.AddIdentityFailed', {
                httpStatusCode: 400,
                'public': true
              }, err));
          }
          // return identity
          res.set('Location', identity.id);
          res.json(201, identity);
        });
  });

  app.server.get(bedrock.config.identity.basePath,
    ensureAuthenticated,
    validate({query: 'services.identity.getIdentitiesQuery'}),
    function(req, res, next) {
      if(req.query.form === 'register') {
        return _getRegisterPublicKey(req, res, next);
      }

      async.waterfall([
        function(callback) {
          payswarm.profile.getProfile(
            req.user.identity, req.user.identity.id, callback);
        },
        function(profile, profileMeta, callback) {
          // get all profile identities
          _getIdentities(req, function(err, identities) {
            callback(err, profile, profileMeta, identities);
          });
        },
        function(profile, profileMeta, identities) {
          getDefaultViewVars(req, function(err, vars) {
            if(err) {
              return callback(err);
            }
            vars.profile = profile;
            vars.profileMeta = profileMeta;
            vars.identities = identities;
            res.render('identities.html', vars);
          });
        }
      ], function(err) {
        if(err) {
          next(err);
        }
      });
  });

  // authentication not required
  app.server.options(idPath, cors());
  app.server.get(idPath, cors(), function(req, res, next) {
    // get ID from URL
    var identityId = payswarm.identity.createIdentityId(req.params.identity);

    // FIXME: refactor this ... just put data into the identity like how
    // it is returned when application/ld+json is accepted?
    var data = {};

    // FIXME: use auto here instead
    async.waterfall([
      function(callback) {
        // get identity without permission check
        payswarm.identity.getIdentity(null, identityId, function(
          err, identity, meta) {
          if(err) {
            return callback(err);
          }

          data.privateIdentity = identity;

          // determine if requestor is the identity
          var isIdentity = req.isAuthenticated() &&
            identity.id === req.user.identity.id;
          if(isIdentity) {
            data.identity = identity;
          } else {
            // only include public info
            data.publicIdentity = {
              '@context': bedrock.config.constants.CONTEXT_URL,
              id: identity.id,
              type: identity.type
            };
            identity.sysPublic.forEach(function(field) {
              data.publicIdentity[field] = identity[field];
            });
            data.identity = data.publicIdentity;
          }
          data.identityMeta = meta;
          callback();
        });
      },
      function(callback) {
        // FIXME: can be skipped if not sending html
        getDefaultViewVars(req, function(err, vars) {
          if(err) {
            return callback(err);
          }
          data.vars = vars;
          vars.identity = data.identity;
          vars.identityMeta = data.identityMeta;
          callback();
        });
      },
      function(callback) {
        // get identity's accounts
        payswarm.financial.getIdentityAccounts(
          null, identityId, function(err, records) {
            callback(err, records);
          });
      },
      function(records, callback) {
        // add non-deleted accounts that have public information or are owned
        var accounts = data.accounts = data.vars.accounts = [];
        records.forEach(function(record) {
          var account = record.account;
          if(account.sysStatus !== 'deleted') {
            // determine if requestor is the owner of the account
            var isOwner = req.isAuthenticated() &&
              data.privateIdentity.owner === req.user.identity.id &&
              account.owner === identityId;

            // show only public properties for the account
            if(isOwner) {
              accounts.push(account);
            } else if(account.sysPublic.length > 0) {
              var publicAccount = {
                '@context': payswarm.constants.CONTEXT_URL,
                id: account.id, type: account.type
              };
              account.sysPublic.forEach(function(prop) {
                if(prop in account) {
                  publicAccount[prop] = account[prop];
                }
              });
              accounts.push(publicAccount);
            }
          }
        });
        callback();
      },
      function(callback) {
        // get identity's keys
        payswarm.identity.getIdentityPublicKeys(
          identityId, function(err, records) {
            callback(err, records);
          });
      },
      function(records, callback) {
        var keys = data.keys = data.vars.keys = [];
        records.forEach(function(record) {
          var key = record.publicKey;
          if(key.sysStatus === 'active') {
            keys.push(key);
          }
        });
        callback(null);
      }
    ], function(err) {
      if(err) {
        return next(err);
      }

      function ldjson() {
        // build identity w/embedded accounts and keys
        var identity = data.identity;
        for(var i = 0; i < data.accounts.length; ++i) {
          var account = data.accounts[i];
          delete account['@context'];
          jsonld.addValue(identity, 'account', account);
        }
        for(var i = 0; i < data.keys.length; ++i) {
          var key = data.keys[i];
          delete key['@context'];
          delete key.publicKeyPem;
          delete key.sysStatus;
          jsonld.addValue(identity, 'publicKey', key);
        }
        res.json(identity);
      }
      res.format({
        'application/ld+json': ldjson,
        json: ldjson,
        html: function() {
          res.render('identity.html', data.vars);
        }
      });
      return;
    });
  });

  callback(null);
}

/**
 * Handles a request to get a public key registration form.
 *
 * @param req the request.
 * @param res the response.
 * @param next the next handler.
 */
function _getRegisterPublicKey(req, res, next) {
  async.waterfall([
    function(callback) {
      getDefaultViewVars(req, callback);
    },
    function(vars, callback) {
      vars.clientData.publicKey = {};
      // add query vars
      if(req.query['public-key']) {
        vars.publicKeyPem = req.query['public-key'];
      }
      vars.clientData.publicKey.label =
        req.query['public-key-label'] || 'Access Key';
      if(req.query['registration-callback']) {
        vars.clientData.registrationCallback =
          req.query['registration-callback'];
      }
      if(req.query['response-nonce']) {
        vars.clientData.responseNonce = req.query['response-nonce'];
      }

      // get all profile identities
      _getIdentities(req, function(err, identities) {
        vars.profile = vars.session.profile;
        vars.identities = identities;
        callback(err, vars);
      });
    }
  ], function(err, vars) {
    if(err) {
      return next(err);
    }

    res.render('register-public-key.html', vars);
  });
}

/**
 * Gets a Profile's Identities, including each Identity's FinancialAccounts
 * and PublicKeys.
 *
 * @param req the request with the Profile.
 * @param callback(err, identities) called once the operation completes.
 */
function _getIdentities(req, callback) {
  // get all profile identities
  payswarm.identity.getProfileIdentities(
    req.user.identity, req.user.identity.id, function(err, records) {
      if(err) {
        return callback(err);
      }
      var identities = [];
      records.forEach(function(record) {
        identities.push(record.identity);
      });
      // get accounts and public keys for each identity
      async.forEach(identities, function(identity, callback) {
        async.auto({
          getAccounts: function(callback) {
            payswarm.financial.getIdentityAccounts(
              req.user.identity, identity.id, callback);
          },
          getKeys: function(callback) {
            payswarm.identity.getIdentityPublicKeys(
              identity.id, callback);
          }
        }, function(err, result) {
          if(err) {
            return callback(err);
          }
          // add accounts and keys to identity
          identity.accounts = [];
          result.getAccounts.forEach(function(record) {
            var account = record.account;
            if(account.sysStatus !== 'deleted') {
              identity.accounts.push(account);
            }
          });
          identity.keys = [];
          result.getKeys.forEach(function(record) {
            var key = record.publicKey;
            if(key.sysStatus === 'active') {
              identity.keys.push(key);
            }
          });
          callback();
        });
      }, function(err) {
        callback(err, identities);
      });
    });
}
