/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var crypto = require('crypto');
var jsonld = require('./jsonld'); // use locally-configured jsonld
var payswarm = {
  financial: require('./financial'),
  money: require('./money'),
  security: require('./security'),
  tools: require('./tools')
};
var util = require('util');
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

// constants
var MODULE_NS = payswarm.financial.namespace;

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

var EVENT_SCAN = 'common.PaymentToken.scan';

// sub module API
var api = {};
module.exports = api;

// distributed ID generator
var paymentTokenIdGenerator = null;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function openCollections(callback) {
      // open all necessary collections
      brDatabase.openCollections(['paymentToken'], callback);
    },
    function setupCollections(callback) {
      // setup collections (create indexes, etc)
      brDatabase.createIndexes([{
        collection: 'paymentToken',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        collection: 'paymentToken',
        fields: {owner: 1},
        options: {unique: false, background: true}
      }, {
        // used by workers to find unverified tokens
        collection: 'paymentToken',
        fields: {'meta.updated': -1, 'paymentToken.sysVerified': 1, id: 1},
        options: {unique: true, background: true}
      }, {
        // used by workers to find expired tokens
        collection: 'paymentToken',
        fields: {'paymentToken.sysExpires': 1, id: 1},
        options: {unique: true, background: true}
      }, {
        // used by workers to find previously marked tokens
        collection: 'paymentToken',
        fields: {workerId: 1, id: 1},
        options: {unique: true, background: true}
      }, {
        // used to count total number of unverified tokens
        collection: 'paymentToken',
        fields: {'paymentToken.sysVerified': 1},
        options: {unique: false, background: true}
      }], callback);
    },
    function(callback) {
      brDatabase.getDistributedIdGenerator('paymentToken',
        function(err, idGenerator) {
          if(!err) {
            paymentTokenIdGenerator = idGenerator;
          }
          callback(err);
      });
    }
  ], callback);
});

// FIXME: temporary hack to wait for payment gateways to load, needs better
// event design
bedrock.events.on('p3-financial.init', function(callback) {
  async.auto({
    createTokens: function(callback) {
      // create payment tokens, ignoring duplicate errors
      async.eachSeries(
        bedrock.config.financial.paymentTokens, function(options, callback) {
          var create = function() {
            options.generateId = false;
            api.createPaymentToken(null, options, function(err) {
              if(err && brDatabase.isDuplicateError(err)) {
                err = null;
              }
              callback(err);
            });
          };
          // no token ID given, create it
          if(!options.token.id) {
            return create();
          }
          // token ID given, check for duplicate before attempting create
          brDatabase.collections.paymentToken.findOne(
            {id: brDatabase.hash(options.token.id)}, {},
            function(err, record) {
              if(err || !record) {
                return create();
              }
              callback();
            });
        }, callback);
    },
    runWorkers: ['createTokens', function(callback) {
      bedrock.events.emitLater({
        type: EVENT_SCAN,
        details: {algorithm: 'verify'}
      });
      bedrock.events.emitLater({
        type: EVENT_SCAN,
        details: {algorithm: 'remove'}
      });
      callback();
    }]
  }, function(err) {
    callback(err);
  });
});

// add listener for scan events
bedrock.events.on(EVENT_SCAN, function(event) {
  logger.verbose('got payment token scan event', event);
  var options = {};
  if(event && event.details && event.details.algorithm) {
    options.algorithm = event.details.algorithm;
    if(event.details.paymentTokenId) {
      options.id = event.details.paymentTokenId;
    } else {
      options.reschedule =
        bedrock.config.financial.paymentToken.worker.schedule;
    }
    process.nextTick(function() {_runWorker(options);});
  }
});

/**
 * Creates a PaymentToken ID from the given Identity ID and PaymentToken slug.
 *
 * @param ownerId the Identity ID.
 * @param name the short PaymentToken name (slug).
 *
 * @return the PaymentToken ID.
 */
api.createPaymentTokenId = function(ownerId, name) {
  return util.format('%s/payment-tokens/%s', ownerId, encodeURIComponent(name));
};

/**
 * Creates a new PaymentTokenId based on the owner's IdentityId.
 *
 * @param ownerId the ID of the Identity that owns the PaymentToken.
 * @param callback(err, id) called once the operation completes.
 */
api.generatePaymentTokenId = function(ownerId, callback) {
  paymentTokenIdGenerator.generateId(function(err, id) {
    if(err) {
      return callback(err);
    }
    callback(null, api.createPaymentTokenId(ownerId, id));
  });
};

/**
 * Creates a payment token for the given source of funds (eg: CreditCard or
 * BankAccount), if supported by the gateway given by the 'gateway' option. The
 * token must also specify 'id', 'owner', and 'label'. A unique ID could be
 * generated with the generatePaymentTokenId API function.
 *
 * If tokenization is not supported by the gateway, an error will be raised.
 *
 * @param actor the Identity performing the action.
 * @param options the options to use.
 *          source the source of funds (eg: CreditCard, BankAccount).
 *          gateway the gateway to generate the token from.
 *          token the PaymentToken with custom information to store.
 * @param callback(err, record) called once the operation completes.
 */
api.createPaymentToken = function(actor, options, callback) {
  var source = options.source;
  var gateway = options.gateway || null;
  var token = options.token || {};

  var isAuthority = (!actor || actor.id === bedrock.config.authority.id);

  // if gateway not provided, use default for source type
  if(gateway === null) {
    var gateways = bedrock.config.financial.defaults.paymentGateways;
    var types = jsonld.getValues(source, 'type');
    for(var i = 0; i < types.length; ++i) {
      var type = types[i];
      if(type in gateways) {
        gateway = gateways[source.type];
        break;
      }
    }
  }

  if(!(gateway in payswarm.financial.paymentGateways)) {
    return callback(new BedrockError(
      'Could not create payment token. Unknown payment gateway specified.',
      MODULE_NS + '.PaymentGatewayNotFound',
      {gateway: gateway}));
  }

  // get gateway
  gateway = payswarm.financial.paymentGateways[gateway];

  // to use authority-only gateway, the actor must be null or authority and
  // source must be owned by authority
  if(gateway && gateway.authorityOnly &&
    ((actor && actor.id !== bedrock.config.authority.id) ||
    (token.owner !== bedrock.config.authority.id))) {
    return callback(new BedrockError(
      'Could not create payment token using the given payment gateway. ' +
      'Permission denied.',
      'payswarm.permission.PermissionDenied',
      {gateway: gateway}));
  }

  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_CREATE, {
          resource: token,
          translate: 'owner'
        }, callback);
    },
    function(callback) {
      // cards are instantly verified, so allow them to pass
      if(jsonld.hasValue(source, 'type', 'CreditCard')) {
        return callback();
      }

      // no limits for authority
      if(isAuthority) {
        return callback();
      }

      // get existing number of unverified payment tokens to check limit
      var limit = bedrock.config.financial.paymentToken
        .maxUnverifiedPerIdentity;
      brDatabase.collections.paymentToken.find({
        owner: brDatabase.hash(token.owner),
        'paymentToken.sysVerified': false
      }, {owner: true}).count(function(err, count) {
        if(err) {
          return callback(err);
        }
        if(count >= limit) {
          return callback(new BedrockError(
            'The maximum number of concurrent unverified payment methods has ' +
            'been exceeded.',
            MODULE_NS + '.UnverifiedPaymentTokenLimitExceeded',
            {'public': true, max: limit}));
        }
        callback();
      });
    },
    function(callback) {
      // cards are instantly verified, so allow them to pass
      if(jsonld.hasValue(source, 'type', 'CreditCard')) {
        return callback();
      }

      // no limits for authority
      if(isAuthority) {
        return callback();
      }

      // get existing number of unverified payment tokens to check global limit
      var limit = bedrock.config.financial.paymentToken.maxUnverified;
      brDatabase.collections.paymentToken.find({
        'paymentToken.sysVerified': false
      }, {'paymentToken.sysVerified': true}).count(function(err, count) {
        if(err) {
          return callback(err);
        }
        if(count >= limit) {
          err = new BedrockError(
            'The maximum number of globally concurrent unverified ' +
            'payment methods has been exceeded.',
            MODULE_NS + '.UnverifiedPaymentTokenLimitExceeded',
            {'public': true});
          // emit payment token failure event
          bedrock.events.emitLater({
            type: 'common.PaymentToken.unverifiedLimitReached',
            details: {
              error: err.toObject(),
              limit: limit
            }
          });
          return callback(err);
        }
        callback();
      });
    },
    function(callback) {
      // cards are instantly verified, so allow them to pass
      if(jsonld.hasValue(source, 'type', 'CreditCard')) {
        return callback();
      }

      // no limits for authority
      if(isAuthority) {
        return callback();
      }

      // Check verify account has sufficient balance.
      // Verify values are created later so check for max possible amount.
      // NOTE: There is a race condition between this check and the actual
      // transaction taking place. Make sure the server and UI also handle low
      // balance exceptions later.
      var tokenCfg = bedrock.config.financial.paymentToken;
      var max = payswarm.money.createStingyMoney(tokenCfg.maxVerifyAmount);
      var maxTotal = max.multiply(tokenCfg.verifyAmounts);
      var verifySource = bedrock.config.financial.paymentTokenVerifyAccount;

      payswarm.financial.getAccount(null, verifySource,
        function(err, account) {
        if(err) {
          return callback(err);
        }
        var balance = payswarm.money.createStingyMoney(account.balance);
        if(balance.compareTo(maxTotal) < 0) {
          // simple public error
          err = new BedrockError(
            'Unable to create payment method at this time. ' +
            'The support team has been notified.',
            MODULE_NS + '.PaymentTokenCreationError',
            {'public': true});
          // emit balance too low event
          bedrock.events.emitLater({
            type: 'common.PaymentToken.verifyBalanceTooLow',
            details: {
              account: verifySource,
              balance: account.balance,
              currency: account.currency
            }
          });
          return callback(err);
        }
        callback();
      });
    },
    function(callback) {
      // create token via gateway
      gateway.createPaymentToken(source, token, callback);
    },
    function(token, callback) {
      // tokenization not supported
      if(token === null) {
        return callback(new BedrockError(
          'The payment gateway does not support storing payment methods.',
          MODULE_NS + '.PaymentTokensNotSupported',
          {'public': true}));
      }

      // set default verify ready state
      if(!('sysVerifyReady' in token)) {
        token.sysVerifyReady = token.sysVerified;
      }
      // set status to active
      token.sysStatus = 'active';

      // create record
      var now = +new Date();
      var record = {
        id: brDatabase.hash(token.id),
        owner: brDatabase.hash(token.owner),
        meta: {
          created: now,
          updated: now
        },
        paymentToken: token
      };
      brDatabase.collections.paymentToken.insert(
        record, brDatabase.writeOptions, function(err, result) {
          if(err) {
            return callback(err);
          }
          callback(err, result.ops[0]);
        });
    },
    function(record, callback) {
      // if token isn't owned by authority and is a bank account, create
      // verify data for it
      var token = record.paymentToken;
      if(token.owner === bedrock.config.authority.id ||
        token.paymentMethod !== 'BankAccount') {
        return callback(null, record);
      }
      api.createPaymentTokenVerifyData(actor, token.id, function(err) {
        if(err) {
          // verify data failed, delete payment token (treat as if it wasn't)
          // created
          var cause = err;
          return async.waterfall([
            function(callback) {
              brDatabase.collections.paymentToken.remove(
                {id: brDatabase.hash(token.id)}, callback);
            }
          ], function(err) {
            // FIXME: handle corner-case where token is not removed

            // server-side error
            if(!err &&
              cause.name === MODULE_NS + '.PaymentTokenCreationError') {
              return callback(cause);
            }

            // client-side error
            callback(new BedrockError(
              'The payment method could not be verified. Please ensure that ' +
              'the information you entered is correct and try again.',
              MODULE_NS + '.NotVerified',
              {'public': true, httpStatusCode: 400}, cause));
          });
        }
        // emit payment token (bank account) creation event
        bedrock.events.emitLater({
          type: 'common.PaymentToken.bankAccountCreated',
          details: {
            identityId: token.owner,
            triggers: ['getIdentity'],
            paymentToken: token
          }
        });
        brDatabase.collections.paymentToken.findOne(
          {id: brDatabase.hash(token.id)}, {}, callback);
      });
    }
  ], callback);
};

/**
 * Gets the PaymentToken by token ID.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the PaymentToken to retrieve.
 * @param callback(err, token, meta) called once the operation completes.
 */
api.getPaymentToken = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      brDatabase.collections.paymentToken.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new BedrockError(
          'PaymentToken not found.',
          MODULE_NS + '.PaymentTokenNotFound',
          {id: id, httpStatusCode: 404, 'public': true}));
      }
      callback(null, record.paymentToken, record.meta);
    },
    function(paymentToken, meta, callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_ACCESS,
        {resource: paymentToken, translate: 'owner'}, function(err) {
          callback(err, paymentToken, meta);
        });
    }
  ], callback);
};

/**
 * Retrieves all PaymentTokens owned by a particular Identity.
 *
 * @param actor the Identity performing the action.
 * @param identityId the ID of the Identity to get the PaymentTokens for.
 * @param gateway the gateway to filter on (optional).
 * @param callback(err, records) called once the operation completes.
 */
api.getIdentityPaymentTokens = function(actor, identityId, gateway, callback) {
  if(typeof gateway === 'function') {
    callback = gateway;
    gateway = null;
  }

  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_ACCESS, {resource: identityId},
        callback);
    },
    function(callback) {
      var query = {owner: brDatabase.hash(identityId)};
      if(gateway) {
        query['paymentToken.paymentGateway'] = gateway;
      }
      brDatabase.collections.paymentToken.find(query, {}).toArray(callback);
    },
    function(records, callback) {
      // return records if non-empty or not creating default payment tokens
      var create = bedrock.config.financial.createDefaultPaymentTokens;
      if(records.length > 0 || !create) {
        return callback(null, records);
      }

      // create default tokens
      var sources = bedrock.config.financial.defaults.paymentTokens;
      if(sources.length === 0) {
        // no default tokens
        return callback(null, []);
      }

      async.eachSeries(sources, function(source, callback) {
        if(gateway && gateway !== source.paymentGateway) {
          // skip gateway that doesn't match query
          return callback();
        }

        api.generatePaymentTokenId(identityId, function(err, tokenId) {
          if(err) {
            return callback(err);
          }
          // create token
          var token = {
            id: tokenId,
            type: 'PaymentToken',
            owner: identityId,
            label: source.label,
            paymentGateway: source.paymentGateway
          };
          api.createPaymentToken(
            actor, {
              source: source,
              gateway: source.paymentGateway,
              token: token
            }, function(err, token) {
              callback(err);
            });
        });
      }, function(err) {
        if(err) {
          return callback(err);
        }
        // re-run query
        api.getIdentityPaymentTokens(actor, identityId, gateway, callback);
      });
    }
  ], callback);
};

/**
 * Retrieves all PaymentTokens matching the given query.
 *
 * @param actor the Identity performing the action.
 * @param [query] the query to use (defaults to {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 */
api.getPaymentTokens = function(actor, query, fields, options, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  } else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  } else if(typeof options === 'function') {
    callback = options;
    options = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_ADMIN, callback);
    },
    function(callback) {
      brDatabase.collections.paymentToken.find(
        query, fields, options).toArray(callback);
    }
  ], callback);
};

/**
 * Updates an existing PaymentToken. Use this method to change the
 * PaymentToken basic parameters, do not use it to change the
 * PaymentToken external details such as account numbers or similar.
 *
 * @param actor the Identity performing the action.
 * @param paymentTokenUpdate the PaymentToken with id and fields to update.
 * @param callback(err) called once the operation completes.
 */
api.updatePaymentToken = function(actor, paymentTokenUpdate, callback) {
  async.auto({
    getPaymentToken: function(callback) {
      // Note: The payment token is used to determine the payment method
      // and which fields are allowed to be updated.
      payswarm.financial.getPaymentToken(null, paymentTokenUpdate.id,
        function(err, paymentToken) {
          callback(err, paymentToken);
        });
    },
    checkPermission: ['getPaymentToken', function(callback, results) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_EDIT,
        {resource: results.getPaymentToken, translate: 'owner'}, callback);
    }],
    sanitizePaymentToken: ['checkPermission', function(callback, results) {
      // sanitized update object
      var update = {
        id: paymentTokenUpdate.id
      };
      // copy generic fields
      if('label' in paymentTokenUpdate) {
        update.label = paymentTokenUpdate.label;
      }
      // method specific fields
      if(results.getPaymentToken.paymentMethod === 'CreditCard') {
        // FIXME: support editable fields
      }
      if(results.getPaymentToken.paymentMethod === 'BankAccount') {
        // FIXME: support editable fields
      }
      callback(null, update);
    }],
    update: ['sanitizePaymentToken', function(callback, results) {
      brDatabase.collections.paymentToken.update(
        {id: brDatabase.hash(results.sanitizePaymentToken.id)},
        {$set: brDatabase.buildUpdate(
          results.sanitizePaymentToken, 'paymentToken')},
        brDatabase.writeOptions,
        callback);
    }],
    checkResult: ['update', function(callback, results) {
      if(results.update.result.n !== 0) {
        return callback();
      }
      callback(new BedrockError(
        'Could not update PaymentToken. PaymentToken not found.',
        MODULE_NS + '.PaymentTokenNotFound',
        {httpStatusCode: 404, 'public': true}));
    }]
  }, function(err) {
    callback(err);
  });
};

/**
 * Removes a PaymentToken. This method may mark a payment token with an
 * expiration date for later removal, in which case the corresponding record
 * will be returned with the up-to-date expiration information.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the PaymentToken to remove.
 * @param callback(err, record) called once the operation completes.
 */
api.removePaymentToken = function(actor, id, callback) {
  async.auto({
    checkPermission: function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_REMOVE, {
          resource: id,
          translate: 'owner',
          get: _getPaymentTokenForPermissionCheck
        }, callback);
    },
    getToken: ['checkPermission', function(callback) {
      brDatabase.collections.paymentToken.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    }],
    getExpires: ['getToken', function(cb, results) {
      // token does not exist, return as if removed
      var record = results.getToken;
      if(record === null) {
        return callback(null, null);
      }

      // get expiration time for token
      var token = record.paymentToken;
      var expiration = bedrock.config.financial.paymentToken.expiration;
      var expires = 0;
      for(var type in expiration) {
        if(jsonld.hasValue(token, 'paymentMethod', type)) {
          expires = Math.max(0, expiration[type]);
          break;
        }
      }
      cb(null, expires);
    }],
    expireToken: ['getExpires', function(callback, results) {
      // mark token as deleted, set expiration time
      var expires = results.getExpires;
      var now = +new Date();
      brDatabase.collections.paymentToken.update({
        id: brDatabase.hash(id),
        // token must not currently be a backup source for any account
        'paymentToken.backupSourceFor.0': {$exists: false},
        $or: [
          {'paymentToken.sysVerified': true},
          {'paymentToken.sysStatus': 'disabled'}
        ]
      }, {
        $set: {
          'meta.updated': now,
          'paymentToken.sysStatus': 'deleted',
          'paymentToken.sysExpires': now + expires
        }
      }, brDatabase.writeOptions, callback);
    }],
    getExpiredToken: ['expireToken', function(callback) {
      brDatabase.collections.paymentToken.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    }],
    removeToken: ['getExpiredToken', function(callback, results) {
      // remove immediately and return null only if expiration time is 0
      var expires = results.getExpires;
      if(expires === 0) {
        return brDatabase.collections.paymentToken.remove({
          id: brDatabase.hash(id),
          'paymentToken.sysStatus': 'deleted'
        }, brDatabase.writeOptions, function(err) {
          callback(err, null);
        });
      }
      callback();
    }],
    checkExpiredToken: ['removeToken', function(callback, results) {
      if(results.getExpiredToken) {
        var token = results.getExpiredToken.paymentToken;
        if(token.sysStatus !== 'deleted') {
          if(!token.sysVerified) {
            return callback(new BedrockError(
              'An unverified PaymentToken cannot be deleted.',
              MODULE_NS + '.UnverifiedPaymentToken',
              {id: id, httpStatusCode: 400, 'public': true}));
          }
          if(token.backupSourceFor && token.backupSourceFor.length > 0) {
            return callback(new BedrockError(
              'A PaymentToken that is used as a backup source for a ' +
              'FinancialAccount cannot be deleted.',
              MODULE_NS + '.BackupSourcePaymentToken',
              {id: id, httpStatusCode: 400, 'public': true}));
          }
        }
      }
      callback();
    }]
  }, function(err, results) {
    callback(err, results ? results.getExpiredToken : null);
  });
};

/**
 * Restores a deleted, but not yet expired, PaymentToken.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the PaymentToken to undelete.
 * @param callback(err, record) called once the operation completes.
 */
api.restorePaymentToken = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      // use create permission for undeleting
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_CREATE, {
          resource: id,
          translate: 'owner',
          get: _getPaymentTokenForPermissionCheck
        }, callback);
    },
    function(callback) {
      brDatabase.collections.paymentToken.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    },
    function(record, callback) {
      // token does not exist, cannot undelete
      if(record === null) {
        return callback(new BedrockError(
          'PaymentToken not found.',
          MODULE_NS + '.PaymentTokenNotFound',
          {id: id, 'public': true}));
      }

      // mark token as active, clear expiration
      brDatabase.collections.paymentToken.update(
        {id: brDatabase.hash(id)}, {
          $set: {
            'meta.updated': +new Date(),
            'paymentToken.sysStatus': 'active'
          },
          $unset: {'paymentToken.sysExpires': true}
        }, brDatabase.writeOptions, function(err) {
          callback(err);
        });
    },
    function(callback) {
      brDatabase.collections.paymentToken.findOne(
        {id: brDatabase.hash(id)}, {}, callback);
    }
  ], callback);
};

/**
 * Creates verify data for a PaymentToken.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the PaymentToken to create verify data for.
 * @param callback(err) called once the operation completes.
 */
api.createPaymentTokenVerifyData = function(actor, id, callback) {
  // TODO: use async.auto as it may make this cleaner
  async.waterfall([
    function(callback) {
      api.getPaymentToken(null, id, callback);
    },
    function(token, meta, callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_EDIT,
        {resource: token, translate: 'owner'}, function(err) {
          callback(err, token, meta);
        });
    },
    function(token, meta, callback) {
      // already verified
      if(token.sysVerified) {
        return callback(new BedrockError(
          'Payment token already verified.',
          MODULE_NS + '.AlreadyVerified', {id: id}));
      }
      // only allow verify data for non-bank accounts
      if(token.paymentMethod !== 'BankAccount') {
        return callback(new BedrockError(
          'Payment token payment method does not require verification.',
          MODULE_NS + '.VerificationNotApplicable', {id: id}));
      }
      // do not overwrite existing verify data
      if(meta.verify) {
        return callback(new BedrockError(
          'Payment token verification data already exists.',
          MODULE_NS + '.VerifyDataAlreadyExists', {id: id}));
      }

      // create verify transactions (withdrawals)
      var txns = [];
      var tokenCfg = bedrock.config.financial.paymentToken;
      var amounts = tokenCfg.verifyAmounts;
      var min = tokenCfg.minVerifyAmount;
      var max = tokenCfg.maxVerifyAmount;
      for(var i = 0; i < amounts; ++i) {
        // generate random amount between limits
        var amount = '' + (Math.random() * (max - min) + min);
        amount = payswarm.money.createStingyMoney(amount);

        /* Note: Create a unique reference ID for the withdrawal that can be
        queried for later. This is used re-link withdrawals with payment
        tokens, if necessary, due to failures before the withdrawal IDs
        can be written to the payment token meta data. */
        var referenceId = 'payswarm.verifyPaymentToken.' +
          brDatabase.hash(token.id) + '.' + meta.created + '.' +
          bedrock.util.uuid();

        // create withdrawal
        txns.push({
          type: ['Transaction', 'Withdrawal'],
          source: bedrock.config.financial.paymentTokenVerifyAccount,
          destination: token.id,
          payee: [{
            type: 'Payee',
            payeeGroup: ['withdrawal'],
            payeeRate: amount.toString(),
            payeeRateType: 'FlatAmount',
            payeeApplyType: 'ApplyExclusively',
            destination: token.id,
            currency: 'USD',
            comment: 'Payment token verification transaction'
          }],
          referenceId: referenceId
        });
      }
      callback(null, txns);
    },
    function(txns, callback) {
      // sign and process withdrawal txns
      var withdrawals = [];
      async.eachSeries(txns, function(txn, callback) {
        payswarm.financial.signWithdrawal(
          null, txn, {verify: true, noGatewayPayees: true},
          function(err, signed) {
            if(err) {
              return callback(err);
            }
            payswarm.financial.processWithdrawal(
              null, signed, {verify: true}, function(err, w) {
                if(!err) {
                  withdrawals.push({id: w.id, amount: w.amount});
                }
                callback(err);
              });
          });
      }, function(err) {
        if(err && err.name === 'payswarm.financial.InsufficientFunds') {
          // simple public error
          err = new BedrockError(
            'Unable to create payment method at this time. ' +
            'The support team has been notified.',
            MODULE_NS + '.PaymentTokenCreationError',
            {'public': true});
          // emit balance too low event
          bedrock.events.emitLater({
            type: 'common.PaymentToken.verifyBalanceTooLow',
            details: {
              account: bedrock.config.financial.paymentTokenVerifyAccount
            }
          });
        }
        callback(err, withdrawals);
      });
    },
    function(txns, callback) {
      // add verify data to payment token meta
      brDatabase.collections.paymentToken.update(
        {id: brDatabase.hash(id)},
        {$set: {
          'paymentToken.sysVerified': false,
          'paymentToken.sysVerifyReady': false,
          'meta.verify': {transactions: txns, attempts: 0}
        }},
        brDatabase.writeOptions, function(err) {
          callback(err);
        });
    }
  ], callback);
};

/**
 * Verifies a PaymentToken. The verification check can be performed without
 * marking the PaymentToken as verified if requested via options.
 *
 * @param actor the Identity performing the action.
 * @param id the ID of the PaymentToken to verify.
 * @param options the options to use.
 *          [amounts] the verification amounts for a bank account token.
 *          [update] true to mark the PaymentToken as verified on success,
 *            false not to (default: false).
 *          [force] true to forcibly mark the PaymentToken as verified,
 *            false not to (default: false).
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyPaymentToken = function(actor, id, options, callback) {
  options = options || {};
  if(!options.amounts && !options.force) {
    return callback(new BedrockError(
      'Invalid verification parameters.',
      MODULE_NS + '.InvalidParameter', {id: id}));
  }

  // TODO: use async.auto as it may make this cleaner
  async.waterfall([
    function(callback) {
      api.getPaymentToken(null, id, callback);
    },
    function(token, meta, callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PAYMENT_TOKEN_EDIT,
        {resource: token, translate: 'owner'}, function(err) {
          callback(err, token, meta);
        });
    },
    function(token, meta, callback) {
      // already verified or forcing verification
      if(token.sysVerified || options.force) {
        return callback(null, token, true);
      }

      // always verify non-bank accounts
      if(token.paymentMethod !== 'BankAccount') {
        return callback(null, token, true);
      }
      if(!meta.verify) {
        return callback(new BedrockError(
          'Payment token verification data not found.',
          MODULE_NS + '.VerifyDataNotFound', {id: id}));
      }

      // check attempts against maximum allowed
      var max = bedrock.config.financial.paymentToken.maxVerifyAttempts;
      if(meta.verify.attempts >= max) {
        return callback(new BedrockError(
          'The maximum number of verification attempts has been exceeded.',
          MODULE_NS + '.MaxVerifyAttemptsExceeded', {
            id: id,
            'public': true
          }));
      }

      // ensure verify amounts match by converting string arrays to sorted
      // Money arrays and then compare.
      function mcmp(m0, m1) {
        return m0.compareTo(m1);
      }
      // stored verification amounts
      var VS = meta.verify.transactions;
      var VM = [];
      for(var i = 0; i < VS.length; ++i) {
        VM.push(payswarm.money.createStingyMoney(VS[i].amount));
      }
      VM.sort(mcmp);

      // amounts to verify
      var AS = options.amounts;
      var AM = [];
      for(var i = 0; i < AS.length; ++i) {
        AM.push(payswarm.money.createStingyMoney(AS[i]));
      }
      AM.sort(mcmp);

      // check lengths match
      var pass = (VM.length === AM.length);
      // check all elements
      for(var i = 0; pass && i < VM.length; ++i) {
        pass = (VM[i].compareTo(AM[i]) === 0);
      }

      // given amounts do not match
      if(!pass) {
        return callback(null, token, false);
      }

      // if verify is ready (withdrawals already settled), done
      if(token.sysVerifyReady) {
        return callback(null, token, true);
      }

      // ensure withdrawals have settled
      _checkVerifyTransactions(token.id, meta, function(err, status) {
        if(!err && status !== 'settled') {
          err = new BedrockError(
            'Payment token verification transactions have not yet settled.',
            MODULE_NS + '.PaymentTokenVerifyTransactionsNotSettled',
            {id: id});
        } else if(status === 'voided') {
          token.sysStatus = 'disabled';
        }
        callback(err, token, err ? false : true);
      });
    },
    function(token, verified, callback) {
      // already set token verified
      if(token.sysVerified) {
        return callback(null, true);
      }

      // verify failed, update token verification attempts
      if(!verified) {
        return brDatabase.collections.paymentToken.update(
          {id: brDatabase.hash(id)},
          {$inc: {'meta.verify.attempts': 1}},
          brDatabase.writeOptions, function(err) {
            callback(err, false);
          });
      }

      // verify success, but do not update token
      if(!options.update) {
        return callback(null, verified);
      }

      // update token to mark as verified
      brDatabase.collections.paymentToken.update(
        {id: brDatabase.hash(id)},
        {$set: {'paymentToken.sysVerified': true}},
        brDatabase.writeOptions, function(err) {
          if(!err) {
            return callback(null, true);
          }
          bedrock.events.emitLater({
            type: 'common.PaymentToken.verified',
            details: {
              triggers: ['getIdentity'],
              identityId: token.owner,
              paymentToken: token
            }
          });
          callback(err, true);
        });
    }
  ], function(err, verified) {
    if(!err) {
      if(!verified) {
        err = new BedrockError(
          'Verification failed.',
          MODULE_NS + '.VerificationFailed', {
            id: id,
            'public': true
          });
      }
    }
    callback(err);
  });
};

/**
 * Checks to ensure the transactions in the given meta's verify data have
 * settled. If the transactions have been voided, then the associated token
 * will be disabled.
 *
 * @param tokenId the token ID.
 * @param meta the meta data for the token.
 * @param callback(err, status) called once the operation completes.
 */
function _checkVerifyTransactions(tokenId, meta, callback) {
  var status = 'settled';
  async.waterfall([
    function(callback) {
      async.each(meta.verify.transactions, function(txn, callback) {
        payswarm.financial.getTransaction(null, txn.id, function(err, txn) {
          if(!txn.settled && status === 'settled') {
            status = 'pending';
          }
          if(txn.voided) {
            status = 'voided';
          }
          callback();
        });
      }, callback);
    },
    function(callback) {
      if(status === 'voided') {
        // mark token as disabled
        return brDatabase.collections.paymentToken.update(
          {id: brDatabase.hash(tokenId), 'paymentToken.sysStatus': 'active'},
          {$set: {
            'meta.updated': +new Date(),
            'paymentToken.sysStatus': 'disabled'
          }}, brDatabase.writeOptions, function(err) {
            if(!err) {
              err = new BedrockError(
                'The payment method has been disabled because its ' +
                'verification transactions were voided. Please delete ' +
                'the payment method and try again.',
                MODULE_NS + '.VerificationFailed', {'public': true});
            }
            callback(err);
          });
      }
      callback();
    }
  ], function(err) {
    callback(err, status);
  });
}

/**
 * Gets a PaymentToken during a permission check.
 *
 * @param token the PaymentToken to get.
 * @param options the options to use.
 * @param callback(err, token) called once the operation completes.
 */
function _getPaymentTokenForPermissionCheck(token, options, callback) {
  if(typeof token === 'object') {
    token = token.id || '';
  }
  api.getPaymentToken(null, token, function(err, token) {
    callback(err, token);
  });
}

/**
 * Creates a worker ID.
 *
 * @return the worker ID.
 */
// TODO: remove, use scheduler
function _createWorkerId() {
  // generate worker ID
  var md = crypto.createHash('sha1');
  md.update((+new Date()).toString(), 'utf8');
  md.update(bedrock.util.uuid());
  return md.digest('hex');
}

/**
 * Runs a worker to check for unverified PaymentTokens that are in need
 * of attention or to remove expired PaymentTokens.
 *
 * @param options the options to use:
 *          id: an optional PaymentToken ID to specifically work on.
 *          algorithm: the algorithm to use ('verify' or 'remove').
 * @param callback(err) called once the operation completes.
 */
// TODO: remove, use schedule
function _runWorker(options, callback) {
  callback = callback || function() {};
  var now = +new Date();

  // get new worker ID
  var workerId = _createWorkerId();

  // build query to mark tokens to be checked
  var query = {};

  var cfg = bedrock.config.financial.paymentToken;
  if(options.algorithm === 'verify') {
    // get time that unverified tokens are considered idle
    var past = now - cfg.worker.tokenIdleTimeout;
    query['meta.updated'] = {$lte: past};
    query['paymentToken.sysVerified'] = false;
    query['paymentToken.sysStatus'] = 'active';
  } else if(options.algorithm === 'remove') {
    query['paymentToken.sysExpires'] = {$lte: now};
    query['paymentToken.sysStatus'] = 'deleted';
  } else {
    return callback(new BedrockError(
      'Invalid PaymentToken worker algorithm.',
      MODULE_NS + '.InvalidWorkerAlgorithm',
      {algorithm: options.algorithm}));
  }

  if(options.id) {
    query.id = brDatabase.hash(options.id);
  } else {
    // only mark tokens that have no worker ID or that are marked with
    // a worker ID but where last updated before the token worker schedule
    // indicating that the worker may have crashed
    var workerExpired =
      (+new Date() - bedrock.config.financial.paymentToken.worker.schedule);
    query.$or = [
      {workerId: null},
      {'meta.updated': {$lte: workerExpired}}
    ];
  }

  logger.verbose(
    'running payment token worker (' + workerId + ') to find ' +
    (options.algorithm === 'verify' ? 'unverified' : 'expired') +
    ' payment token' + (options.id ? (' "' + options.id + '"') : 's') + '...');

  // single update and new record retrieval db write options
  var singleUpdate = bedrock.util.extend(
    {}, brDatabase.writeOptions, {upsert: false, multi: false});

  // run algorithm on all matching entries
  var done = false;
  async.until(function() {return done;}, function(loopCallback) {
    async.waterfall([
      function(callback) {
        brDatabase.collections.paymentToken.update(
          query, {$set: {'meta.updated': +new Date(), workerId: workerId}},
          singleUpdate, function(err) {
            callback(err);
          });
      },
      function(callback) {
        // fetch any marked token
        var markedQuery = {workerId: workerId};
        if(query.id) {
          markedQuery.id = query.id;
        }
        brDatabase.collections.paymentToken.findOne(
          markedQuery, {}, callback);
      },
      function(record, callback) {
        if(record === null) {
          if(options.id) {
            // error when token isn't found and a specific ID was given
            return callback(new BedrockError(
              'PaymentToken not found.',
              MODULE_NS + '.PaymentTokenNotFound'));
          }
          // done, no matching payment tokens remain
          done = true;
          return loopCallback();
        }

        logger.verbose(
          'payment token worker (' + workerId + ') operating on ' +
          'payment token "' + record.paymentToken.id + '"...');

        if(options.algorithm === 'verify') {
          // if not ready to verify, ensure withdrawals have settled
          if(record.meta.verify && !record.paymentToken.sysVerifyReady) {
            return _checkVerifyTransactions(
              record.paymentToken.id, record.meta, function(err, status) {
              if(!err && status === 'settled') {
                record.paymentToken.sysVerifyReady = true;
              } else if(status === 'voided') {
                record.paymentToken.sysStatus = 'disabled';
              }
              callback(null, record, record.paymentToken.sysVerifyReady);
            });
          }
        }
        callback(null, record, false);
      },
      function(record, makeReady, callback) {
        if(options.algorithm === 'remove') {
          brDatabase.collections.paymentToken.remove(
            {id: record.id}, brDatabase.writeOptions, callback);
        } else if(options.algorithm === 'verify') {
          // touch payment token to unidle it (set ready flag if appropriate)
          // and clear worker ID
          var update = {$set: {'meta.updated': now}, $unset: {workerId: true}};

          // mark token as verify ready and set notify date
          if(makeReady) {
            update.$set['paymentToken.sysVerifyReady'] = true;
            update.$set['meta.verify.notified'] = now;
          }

          // update last notify date if email idle time has passed
          var lastNotify = 0;
          if(record.meta.verify && record.paymentToken.sysVerifyReady) {
            lastNotify = now - (record.meta.verify.notified || 0);
          }
          if(lastNotify >= cfg.worker.tokenNotifyIdleTimeout) {
            record.meta.verify.notified = now;
            update.$set['meta.verify.notified'] = now;
          }

          brDatabase.collections.paymentToken.update(
            {id: record.id}, update, singleUpdate, function(err) {
            if(err) {
              return callback(err);
            }
            // if no verification data, skip
            if(!record.meta.verify) {
              return loopCallback();
            }

            // send event that triggers email if notify date is now
            if(record.paymentToken.sysVerifyReady &&
              record.meta.verify.notified === now) {
              // include verify transactions if not in production mode
              var transactions = null;
              var ptConfig = bedrock.config.financial.paymentToken;
              if(ptConfig.includeVerifyTransactions) {
                transactions = record.meta.verify.transactions;
              }

              // send event
              var token = record.paymentToken;
              bedrock.events.emitLater({
                type: 'common.PaymentToken.unverified',
                details: {
                  triggers: ['getIdentity'],
                  identityId: token.owner,
                  paymentToken: token,
                  verify: transactions
                }
              });
            }

            callback();
          });
        }
      }
    ], function(err) {
      // prevent stack overflow
      process.nextTick(function() {
        loopCallback(err);
      });
    });
  }, function(err) {
    if(err) {
      logger.error(
        'error while scanning for ' +
        (options.algorithm === 'verify' ? 'unverified' : 'expired') +
        ' payment tokens', {error: err});
    }
    logger.verbose(
      'payment token worker (' + workerId + ') finished.');

    if(options.reschedule) {
      // reschedule worker if requested
      logger.verbose(
        'rescheduling payment token worker in ' + options.reschedule + ' ms');
      setTimeout(function() {
        var event = {type: EVENT_SCAN, details: {algorithm: options.algorithm}};
        bedrock.events.emitLater(event);
      }, options.reschedule);
    }
    if(callback) {
      callback(err);
    }
  });
}
