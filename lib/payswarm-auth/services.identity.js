/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools'),
  validation: require('./validation'),
  website: require('./website')
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
  app.server.get('/i/:identity/dashboard', ensureAuthenticated,
    function(req, res, next) {
      getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }

        // get identity based on URL
        var id = payswarm.identity.createIdentityId(req.params.identity);
        payswarm.identity.getIdentity(
          req.user.profile, id, function(err, identity) {
            if(err) {
              return next(err);
            }
            vars.identity = identity;
            vars.clientData.identity = id;
            res.render('dashboard.tpl', vars);
          });
      });
  });

  app.server.post('/i',
    ensureAuthenticated,
    validate('services.identity.postIdentities'),
    function(req, res, next) {
      var identity = {};
      identity.id = payswarm.identity.createIdentityId(
        req.body.psaSlug);
      identity.type = req.body.type || 'ps:PersonalIdentity';
      identity.owner = req.user.profile.id;
      identity.psaSlug = req.body.psaSlug;
      identity.label = req.body.label;

      // only set homepage if provided
      if(req.body.homepage) {
        identity.homepage = req.body.homepage;
      }
      // only set description if provided
      if(req.body.description) {
        identity.description = req.body.description;
      }

      // add identity
      payswarm.identity.createIdentity(
        req.user.profile, identity, function(err) {
          if(err) {
            if(payswarm.db.isDuplicateError(err)) {
              err = new PaySwarmError(
                'The identity could not be added.',
                MODULE_TYPE + '.DuplicateIdentity', {
                  identity: identity.id,
                  'public': true
                });
            }
            else {
              err = new PaySwarmError(
                'The identity could not be added.',
                MODULE_TYPE + '.AddIdentityFailed', {
                  'public': true,
                }, err);
            }
            return next(err);
          }
          // return identity
          res.set('Location', identity.id);
          res.json(201, identity);
        });
  });

  app.server.get('/i', ensureAuthenticated,
    function(req, res, next) {
      if(req.query.form === 'register') {
        return _getRegisterPublicKey(req, res, next);
      }

      async.waterfall([
        function(callback) {
          payswarm.profile.getProfile(
            req.user.profile, req.user.profile.id, callback);
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
            res.render('identities.tpl', vars);
          });
        }
      ], function(err) {
        if(err) {
          next(err);
        }
      });
  });

  app.server.post('/i/:identity',
    ensureAuthenticated,
    validate('services.identity.postIdentity'),
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      var identity = {};
      identity.id = identityId;
      identity.label = req.body.label;
      identity.type = req.body.type;

      // only set homepage if provided
      if(req.body.homepage) {
        identity.homepage = req.body.homepage;
      }
      // only set description if provided
      if(req.body.description) {
        identity.description = req.body.description;
      }

      // update identity
      payswarm.identity.updateIdentity(
        req.user.profile, identity, function(err) {
          if(err) {
            return next(err);
          }
          res.send();
        });
  });

  // authentication not required
  app.server.get('/i/:identity', function(req, res, next) {
    // get ID from URL
    var identityId = payswarm.identity.createIdentityId(req.params.identity);

    async.waterfall([
      function(callback) {
        getDefaultViewVars(req, callback);
      },
      function(vars, callback) {
        // FIXME: Check to see if the identity is publicly visible
        // get identity without permission check
        payswarm.identity.getIdentity(
          null, identityId, function(err, identity, meta) {
            vars.identity = identity;
            vars.identityMeta = meta;
            callback(err, vars);
          });
      },
      function(vars, callback) {
        // get identity's accounts
        payswarm.financial.getIdentityAccounts(
          null, identityId, function(err, records) {
            callback(err, vars, records);
          });
      },
      function(vars, records, callback) {
        // add non-deleted accounts that have public information or are owned
        var accounts = vars.accounts = [];
        records.forEach(function(record) {
          var account = record.account;
          if(account.psaStatus !== 'deleted') {
            // determine if requestor is the owner of the account
            var isOwner = req.isAuthenticated() &&
              vars.identity.owner === req.user.profile.id &&
              account.owner === vars.identity.id;

            // show only public properties for the account
            if(!isOwner) {
              var publicAccount = {id: account.id};
              account.psaPublic.forEach(function(prop) {
                if(prop in account) {
                  publicAccount[prop] = account[prop];
                }
              });
              account = publicAccount;
            }

            // add the financial account for display if it has visible data
            if(Object.keys(account).length > 1) {
              accounts.push(account);
            }
          }
        });
        callback(null, vars);
      },
      function(vars, callback) {
        // get identity's keys
        payswarm.identity.getIdentityPublicKeys(
          identityId, function(err, records) {
            callback(err, vars, records);
          });
      },
      function(vars, records, callback) {
        var keys = vars.keys = [];
        records.forEach(function(record) {
          var key = record.publicKey;
          if(key.psaStatus === 'active') {
            keys.push(key);
          }
        });
        callback(null, vars);
      }
    ], function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('identity.tpl', vars);
    });
  });

  app.server.get('/i/:identity/settings', ensureAuthenticated,
    function(req, res, next) {
      getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }

        // get identity based on URL
        var id = payswarm.identity.createIdentityId(req.params.identity);
        payswarm.identity.getIdentity(
          req.user.profile, id, function(err, identity) {
            if(err) {
              return next(err);
            }
            vars.identity = identity;
            vars.clientData.identity = id;
            res.render('settings.tpl', vars);
          });
      });
  });

  app.server.post('/i/:identity/preferences',
    ensureAuthenticated,
    validate('services.identity.postPreferences'),
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      async.auto({
        getAccount: function(callback) {
          payswarm.financial.getAccount(
            req.user.profile, req.body.destination,
            function(err, account) {
              callback(err, account);
            });
        },
        handleKey: function(callback) {
          // get existing key
          if(typeof req.body.publicKey === 'string') {
            return payswarm.identity.getIdentityPublicKey(
              {id: req.body.publicKey}, function(err, key) {
                if(err) {
                  return callback(err);
                }
                callback(null, key);
              });
          }
          // create new key
          // TODO: restrict keys for vendors to 1 (unless user specifically
          // changes it), and/or give warning if the key changes
          var key = {};
          key.type = 'sec:Key';
          key.owner = identityId;
          key.label = req.body.publicKey.label;
          key.publicKeyPem = req.body.publicKey.publicKeyPem;
          payswarm.identity.addIdentityPublicKey(
            req.user.profile, key, function(err, record) {
              // if error was duplicate public key, populate key by PEM
              if(payswarm.db.isDuplicateError(err)) {
                delete key.id;
                return payswarm.identity.getIdentityPublicKey(
                  key, function(err, key) {
                    callback(err, key);
                  });
              }
              if(err) {
                return callback(new PaySwarmError(
                  'The public key could not be added.',
                  MODULE_TYPE + '.AddPublicKeyFailed',
                  {'public': true}, err));
              }
              callback(null, record.publicKey);
            });
        },
        setPreferences: ['getAccount', 'handleKey',
          function(callback, results) {
            var account = results.getAccount;
            var key = results.handleKey;
            // FIXME: populate with correct preferences (old comment, what
            // does this mean?)
            var prefs = {};
            prefs.type = 'ps:Preferences';
            prefs.owner = identityId;
            prefs.destination = account.id;
            prefs.publicKey = key.id;
            payswarm.identity.setIdentityPreferences(
              req.user.profile, prefs, callback);
        }]
      }, function(err, results) {
        if(err) {
          return next(new PaySwarmError(
            'The preferences for the given Identity could not be updated.',
            MODULE_TYPE + '.PreferencesUpdateFailed', {
              identity: identityId,
              'public': true
            }));
        }
        res.send();
      });
  });

  app.server.get('/i/:identity/preferences', ensureAuthenticated,
    function(req, res, next) {
      // get ID from URL
      var identityId = payswarm.identity.createIdentityId(req.params.identity);

      async.waterfall([
        function(callback) {
          payswarm.identity.getIdentityPreferences(
            req.user.profile, {owner: identityId}, callback);
        },
        function(prefs, callback) {
          // send unencrypted preferences if no nonce is provided
          if(!('response-nonce' in req.query)) {
            return callback(null, prefs);
          }
          // send encrypt preferences
          payswarm.identity.encryptMessage(
            prefs, prefs.publicKey,
            req.query['response-nonce'], callback);
        }
      ], function(err, prefs) {
        if(err) {
          return next(err);
        }
        res.json(prefs);
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
      // add query vars
      if(req.query['public-key']) {
        vars.publicKey = req.query['public-key'];
      }
      vars.publicKeyLabel = req.query['public-key-label'] || 'Access Key';
      if(req.query['registration-callback']) {
        vars.registrationCallback = req.query['registration-callback'];
      }
      if(req.query['response-nonce']) {
        vars.responseNonce = req.query['response-nonce'];
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

    res.render('register-public-key.tpl', vars);
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
    req.user.profile, req.user.profile.id, function(err, records) {
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
              req.user.profile, identity.id, callback);
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
            if(account.psaStatus !== 'deleted') {
              identity.accounts.push(account);
            }
          });
          identity.keys = [];
          result.getKeys.forEach(function(record) {
            var key = record.publicKey;
            if(key.psaStatus === 'active') {
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
