/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var crypto = require('crypto');
var jsonld = require('jsonld');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  events: require('./events'),
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  money: require('./money'),
  permission: require('./permission'),
  profile: require('./profile'),
  security: require('./security'),
  tools: require('./tools')
};
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = payswarm.financial.type;
var MODULE_IRI = payswarm.financial.iri;

// module permissions
var PERMISSIONS = {
  PTOKEN_ADMIN: MODULE_IRI + '#payment_token_admin',
  PTOKEN_ACCESS: MODULE_IRI + '#payment_token_access',
  PTOKEN_CREATE: MODULE_IRI + '#payment_token_create',
  PTOKEN_EDIT: MODULE_IRI + '#payment_token_edit',
  PTOKEN_REMOVE: MODULE_IRI + '#payment_token_remove'
};

var EVENT_SCAN = 'common.PaymentToken.scan';

// sub module API
var api = {};
module.exports = api;

// distributed ID generator
var paymentTokenIdGenerator = null;

/**
 * Initializes this module.
 *
 * @param callback(err) called once the operation completes.
 */
api.init = function(callback) {
  // do initialization work
  async.waterfall([
    function openCollections(callback) {
      // open all necessary collections
      payswarm.db.openCollections(['paymentToken'], callback);
    },
    function setupCollections(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'paymentToken',
        fields: {id: 1},
        options: {unique: true, background: true}
      }, {
        // used by workers to find unverified tokens
        collection: 'paymentToken',
        fields: {'meta.updated': -1, 'token.psaVerified': 1, id: 1},
        options: {unique: true, background: true}
      }, {
        // used by workers to find expired tokens
        collection: 'paymentToken',
        fields: {'token.psaExpires': 1, id: 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions,
    function(callback) {
      payswarm.db.getDistributedIdGenerator('paymentToken',
        function(err, idGenerator) {
          if(!err) {
            paymentTokenIdGenerator = idGenerator;
          }
          callback(err);
      });
    },
    function(callback) {
      // create payment tokens, ignoring duplicate errors
      async.forEachSeries(
        payswarm.config.financial.paymentTokens,
        function(options, callback) {
          options.generateId = false;
          api.createPaymentToken(null, options, function(err) {
            if(err && payswarm.db.isDuplicateError(err)) {
              err = null;
            }
            callback(err);
          });
        }, callback);
    }, function(callback) {
      // add listener for scan events
      payswarm.events.on(EVENT_SCAN, function(event) {
        payswarm.logger.debug('got payment token scan event', event);
        var options = {};
        if(event && event.details && event.details.algorithm) {
          options.algorithm = event.details.algorithm;
          if(event.details.paymentTokenId) {
            options.id = event.details.paymentTokenId;
          }
          else {
            options.reschedule =
              payswarm.config.financial.paymentToken.worker.schedule;
          }
          process.nextTick(function() {_runWorker(options);});
        }
      });

      // run workers
      payswarm.events.emit({
        type: EVENT_SCAN,
        details: {algorithm: 'verify'}
      });
      payswarm.events.emit({
        type: EVENT_SCAN,
        details: {algorithm: 'remove'}
      });
      callback();
    }
  ], callback);
};

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
 * BankAccount), if supported by the gateway given by the 'gateway' option. If
 * tokenization is not supported by the gateway, the returned PaymentToken will
 * be null. The token must also specify 'id', 'owner', and 'label'. A unique ID
 * could be generated with the generatePaymentTokenId API function.
 *
 * @param actor the Profile performing the action.
 * @param options the options to use.
 *          source the source of funds (eg: CreditCard, BankAccount).
 *          gateway the gateway to generate the token from.
 *          token the PaymentToken with custom information to store.
 * @param callback(err, record) called once the operation completes.
 */
api.createPaymentToken = function(actor, options, callback) {
  var source = options.source;
  var gateway = options.gateway;
  var token = options.token;
  if(!(gateway in payswarm.financial.paymentGateways)) {
    return callback(new PaySwarmError(
      'Could not create payment token. Unknown payment gateway specified.',
      MODULE_TYPE + '.PaymentGatewayNotFound',
      {gateway: gateway}));
  }

  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, token,
        PERMISSIONS.PTOKEN_ADMIN, PERMISSIONS.PTOKEN_CREATE,
        payswarm.identity.checkIdentityObjectOwner, callback);
    },
    function(callback) {
      // credit cards are instantly verified, so allow them to pass
      if(jsonld.hasValue(source, 'type', 'ccard:CreditCard')) {
        return callback();
      }

      // get existing number of unverified payment tokens to check limit
      var limit = payswarm.config.financial.paymentToken.maxUnverified;
      payswarm.db.collections.paymentToken.find({
        owner: payswarm.db.hash(token.owner),
        'paymentToken.psaVerified': false
      }, {owner: true}).count(function(err, count) {
        if(err) {
          return callback(err);
        }
        if(count >= limit) {
          return callback(new PaySwarmError(
            'Could not create payment method. The maximum number of ' +
            'concurrent unverified payment methods has been exceeded.',
            MODULE_TYPE + '.UnverifiedPaymentTokenLimitExceeded',
            {'public': true, max: limit}));
        }
        callback();
      });
    },
    function(callback) {
      // create token via gateway
      gateway = payswarm.financial.paymentGateways[gateway];
      gateway.createPaymentToken(source, token, callback);
    },
    function(token, callback) {
      // set default verify ready state
      if(!('psaVerifyReady' in token)) {
        token.psaVerifyReady = token.psaVerified;
      }
      // set status to active
      token.psaStatus = 'active';

      // create record
      var now = +new Date();
      var record = {
        id: payswarm.db.hash(token.id),
        owner: payswarm.db.hash(token.owner),
        meta: {
          created: now,
          updated: now
        },
        paymentToken: token
      };
      payswarm.db.collections.paymentToken.insert(
        record, payswarm.db.writeOptions, function(err, records) {
          if(err) {
            return callback(err);
          }
          callback(err, records[0]);
        });
    },
    function(record, callback) {
      // if token isn't owned by authority and is a bank account, create
      // verify data for it
      var token = record.paymentToken;
      if(token.owner === payswarm.config.authority.id ||
        token.paymentMethod !== 'bank:BankAccount') {
        return callback(null, record);
      }
      api.createPaymentTokenVerifyData(actor, token.id, function(err) {
        if(err) {
          return callback(err);
        }
        payswarm.db.collections.paymentToken.findOne(
          {id: payswarm.db.hash(token.id)}, {}, callback);
      });
    }
  ], callback);
};

/**
 * Gets the PaymentToken by token ID.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the PaymentToken to retrieve.
 * @param callback(err, token, meta) called once the operation completes.
 */
api.getPaymentToken = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.paymentToken.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'PaymentToken not found.',
          MODULE_TYPE + '.PaymentTokenNotFound',
          {id: id}));
      }
      callback(null, record.paymentToken, record.meta);
    },
    function(paymentToken, meta, callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, paymentToken,
        PERMISSIONS.PTOKEN_ADMIN, PERMISSIONS.PTOKEN_ACCESS,
        _checkPaymentTokenOwner, function(err) {
          callback(err, paymentToken, meta);
        });
    }
  ], callback);
};

/**
 * Retrieves all PaymentTokens owned by a particular Identity.
 *
 * @param actor the Profile performing the action.
 * @param identityId the ID of the Identity to get the PaymentTokens for.
 * @param gateway the gateway to filter on (optional).
 * @param callback(err, records) called once the operation completes.
 */
api.getIdentityPaymentTokens = function(actor, identityId) {
  var gateway = null;
  var callback;
  if(arguments.length === 3) {
    callback = arguments[2];
  }
  else {
    gateway = arguments[2];
    callback = arguments[3];
  }

  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {owner: identityId},
        PERMISSIONS.PTOKEN_ADMIN, PERMISSIONS.PTOKEN_ACCESS,
        _checkPaymentTokenOwner, callback);
    },
    function(callback) {
      var query = {owner: payswarm.db.hash(identityId)};
      if(gateway) {
        query['paymentToken.paymentGateway'] = gateway;
      }
      payswarm.db.collections.paymentToken.find(query, {}).toArray(callback);
    },
    function(records, callback) {
      // return records if non-empty
      if(records.length > 0) {
        return callback(null, records);
      }

      // create default tokens
      var sources = payswarm.config.financial.defaults.paymentTokens;
      async.forEachSeries(sources, function(source, callback) {
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
            type: 'com:PaymentToken',
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
      },
      function(err) {
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
 * @param actor the Profile performing the action.
 * @param query the query to use (defaults to {}).
 * @param callback(err, records) called once the operation completes.
 */
api.getPaymentTokens = function(actor, query, callback) {
  query = query || {};
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.PTOKEN_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.paymentToken.find(query, {}).toArray(callback);
    }
  ], callback);
};

/**
 * Removes a PaymentToken. This method may mark a payment token with an
 * expiration date for later removal.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the PaymentToken to remove.
 * @param callback(err) called once the operation completes.
 */
api.removePaymentToken = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.PTOKEN_ADMIN, PERMISSIONS.PTOKEN_REMOVE,
        _checkPaymentTokenOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.paymentToken.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      // token does not exist, return as if removed
      if(record === null) {
        return callback();
      }

      // get expiration time for token
      var token = record.paymentToken;
      var now = +new Date();
      var expiration = payswarm.config.financial.paymentToken.expiration;
      var expires = 0;
      for(var type in expiration) {
        if(jsonld.hasValue(token, 'paymentMethod', type)) {
          expires = Math.max(0, expiration[type]);
          break;
        }
      }

      // mark token as deleted, set expiration time
      payswarm.db.collections.paymentToken.update(
        {id: payswarm.db.hash(id)},
        {$set: {
          'meta.updated': now,
          'token.psaStatus': 'deleted',
          'token.psaExpires': now + expires
        }}, payswarm.db.writeOptions, function(err) {
          if(!err && expires === 0) {
            // run removal worker
            payswarm.events.emit({
              type: EVENT_SCAN,
              details: {paymentTokenId: id, algorithm: 'remove'}
            });
          }
          callback(err);
        });
    }
  ], callback);
};

/**
 * Undeletes a PaymentToken.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the PaymentToken to undelete.
 * @param callback(err) called once the operation completes.
 */
api.restorePaymentToken = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      // use create permission for undeleting
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.PTOKEN_ADMIN, PERMISSIONS.PTOKEN_CREATE,
        _checkPaymentTokenOwner, callback);
    },
    function(callback) {
      payswarm.db.collections.paymentToken.findOne(
        {id: payswarm.db.hash(id)}, {}, callback);
    },
    function(record, callback) {
      // token does not exist, cannot undelete
      if(record === null) {
        return callback(new PaySwarmError(
          'PaymentToken not found.',
          MODULE_TYPE + '.PaymentTokenNotFound',
          {id: id}));
      }

      // mark token as active, clear expiration
      payswarm.db.collections.paymentToken.update(
        {id: payswarm.db.hash(id)}, {
          $set: {
            'meta.updated': now,
            'token.psaStatus': 'active'
          },
          $unset: {'token.psaExpires': true}
        }, payswarm.db.writeOptions, function(err) {
          callback(err);
        });
    }
  ], callback);
};

/**
 * Creates verify data for a PaymentToken.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the PaymentToken to create verify data for.
 * @param callback(err) called once the operation completes.
 */
api.createPaymentTokenVerifyData = function(actor, id, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.PTOKEN_ADMIN, PERMISSIONS.PTOKEN_EDIT,
        _checkPaymentTokenOwner, callback);
    },
    function(callback) {
      api.getPaymentToken(actor, id, callback);
    },
    function(token, meta, callback) {
      // already verified
      if(token.psaVerified) {
        return callback(new PaySwarmError(
          'Payment token already verified.',
          MODULE_TYPE + '.AlreadyVerified', {id: id}));
      }
      // only allow verify data for non-bank accounts
      if(token.paymentMethod !== 'bank:BankAccount') {
        return callback(new PaySwarmError(
          'Payment token payment method does not require verification.',
          MODULE_TYPE + '.VerificationNotApplicable', {id: id}));
      }
      // do not overwrite existing verify data
      if(meta.verify) {
        return callback(new PaySwarmError(
          'Payment token verification data already exists.',
          MODULE_TYPE + '.VerifyDataAlreadyExists', {id: id}));
      }

      // FIXME: rate limit/limit # of permitted bank accounts... etc
      // (prevent attackers from stealing tiny amounts of money a little
      // at a time or just accidental awful)

      // create verify transactions (withdrawals)
      var txns = [];
      for(var i = 0; i < 2; ++i) {
        // generate random amount under $0.50
        var amount = payswarm.money.createExternalMoney(Math.random() * 0.5);

        /* Note: Create a unique reference ID for the withdrawal that can be
        queried for later. This is used re-link withdrawals with payment
        tokens, if necessary, due to failures before the withdrawal IDs
        can be written to the payment token meta data. */
        var referenceId = 'payswarm.verifyPaymentToken.' +
          payswarm.db.hash(token.id) + '.' + meta.created + '.' +
          payswarm.tools.uuid();

        // create withdrawal
        txns.push({
          type: ['com:Transaction', 'com:Withdrawal'],
          source: payswarm.config.financial.paymentTokenVerifyAccount,
          destination: token.id,
          payee: [{
            type: 'com:Payee',
            payeePosition: 0,
            payeeRate: amount.toString(),
            payeeRateType: 'com:FlatAmount',
            destination: 'urn:payswarm-external-account',
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
      async.forEachSeries(txns, function(txn, callback) {
        payswarm.financial.signWithdrawal(
          null, txn, {noGatewayPayees: true}, function(err, signed) {
            if(err) {
              return callback(err);
            }
            payswarm.financial.processWithdrawal(
              null, signed, function(err, w) {
                if(!err) {
                  withdrawals.push({id: w.id, amount: w.amount});
                }
                callback(err);
              });
          });
      }, function(err) {
        callback(err, withdrawals);
      });
    },
    function(txns, callback) {
      // add verify data to payment token meta
      payswarm.db.collections.paymentToken.update(
        {id: payswarm.db.hash(id)},
        {$set: {
          'paymentToken.psaVerified': false,
          'paymentToken.psaVerifyReady': false,
          'meta.verify': {transactions: txns}
        }},
        payswarm.db.writeOptions, function(err) {
          callback(err);
        });
    }
  ], callback);
};

/**
 * Verifies a PaymentToken.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the PaymentToken to verify.
 * @param options the options to use.
 *          [amounts] the verification amounts for a bank account token.
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyPaymentToken = function(actor, id, options, callback) {
  if(!options.amounts) {
    return callback(new PaySwarmError(
      'Invalid verification parameters.',
      MODULE_TYPE + '.InvalidParameter', {id: id}));
  }

  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermissionForObject(
        actor, {id: id},
        PERMISSIONS.PTOKEN_ADMIN, PERMISSIONS.PTOKEN_EDIT,
        _checkPaymentTokenOwner, callback);
    },
    function(callback) {
      api.getPaymentToken(actor, id, callback);
    },
    function(token, meta, callback) {
      // already verified
      if(token.psaVerified) {
        return callback(null, token, true);
      }
      // always verify non-bank accounts
      if(token.paymentMethod !== 'bank:BankAccount') {
        return callback(null, token, true);
      }
      if(!meta.verify) {
        return callback(new PaySwarmError(
          'Payment token verification data not found.',
          MODULE_TYPE + '.VerifyDataNotFound', {id: id}));
      }

      // ensure verify amounts match
      var len = meta.verify.transactions.length;
      var pass = (options.amounts.length === len);
      for(var i1 = 0; pass && i1 < len; ++i1) {
        pass = false;
        var amount = meta.verify.transactions[i1].amount;
        var a1 = payswarm.money.createExternalMoney(amount);
        for(var i2 = 0; !pass && i2 < len; ++i2) {
          var a2 = payswarm.money.createExternalMoney(options.amounts[i]);
          if(a1.compareTo(a2) === 0) {
            pass = true;
          }
        }
      }

      // given amounts do not match
      if(!pass) {
        return callback(null, token, false);
      }

      // if verify is ready (withdrawals already settled), done
      if(token.psaVerifyReady) {
        return callback(null, token, true);
      }

      // ensure withdrawals have settled
      _checkVerifyTransactions(meta, function(err, settled) {
        if(!err && !settled) {
          err = new PaySwarmError(
            'Payment token verification transactions have not yet settled.',
            MODULE_TYPE + '.PaymentTokenVerifyTransactionsNotSettled',
            {id: id});
        }
        callback(err, token, err ? false : true);
      });
    },
    function(token, verified) {
      // already set token verified
      if(token.psaVerified) {
        return callback(null, true);
      }
      payswarm.db.collections.paymentToken.update(
        {id: payswarm.db.hash(id)},
        {$set: {'paymentToken.psaVerified': true}},
        payswarm.db.writeOptions, function(err) {
          if(!err) {
            return callback(null, true);
          }
          payswarm.events.emit({
            type: 'common.PaymentToken.verified',
            details: {
              fetchIdentity: true,
              fetchProfile: true,
              identityId: token.owner,
              paymentToken: token
            }
          });
          callback(err);
        });
    }
  ], callback);
};

/**
 * Checks to ensure the transactions in the given meta's verify data have
 * settled.
 *
 * @param meta the meta data for a token.
 * @param callback(err, settled) called once the operation completes.
 */
function _checkVerifyTransactions(meta, callback) {
  var settled = true;
  async.forEach(meta.verify.transactions, function(txn, callback) {
    payswarm.financial.getTransaction(null, txn.id, function(err, txn) {
      if(!txn.settled) {
        settled = false;
      }
      callback();
    });
  }, function(err) {
    callback(err, !err && settled);
  });
}

/**
 * Checks if an actor owns a PaymentToken.
 *
 * @param actor the actor to compare against.
 * @param paymentToken the PaymentToken to compare.
 * @param callback(err, owns) called once the operation completes.
 */
function _checkPaymentTokenOwner(actor, paymentToken, callback) {
  async.waterfall([
    function(callback) {
      if('owner' in paymentToken) {
        callback(null, paymentToken);
      }
      else {
        api.getPaymentToken(actor, paymentToken.id,
          function(err, paymentToken) {
            callback(err, paymentToken);
        });
      }
    },
    function(paymentToken, callback) {
      payswarm.identity.checkIdentityObjectOwner(actor, paymentToken, callback);
    }
  ], callback);
}

/**
 * Creates a worker ID.
 *
 * @return the worker ID.
 */
function _createWorkerId() {
  // generate worker ID
  var md = crypto.createHash('sha1');
  md.update((+new Date()).toString(), 'utf8');
  md.update(payswarm.tools.uuid());
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
function _runWorker(options, callback) {
  callback = callback || function() {};
  var now = +new Date();

  // get new worker ID
  var workerId = _createWorkerId();

  // build query to check tokens
  var query = {};

  if(options.algorithm === 'verify') {
    // get time that unverified tokens are considered idle
    var idleExpiration = payswarm.config.financial.paymentToken
      .worker.tokenIdleTimeout;
    var past = now - idleExpiration;
    query['meta.updated'] = {$lte: past};
    query['paymentToken.psaVerified'] = false;
  }
  else if(options.algorithm === 'remove') {
    query['paymentToken.psaExpires'] = {$lte: now};
    query['paymentToken.status'] = 'deleted';
  }
  else {
    return callback(new PaySwarmError(
      'Invalid PaymentToken worker algorithm.',
      MODULE_TYPE + '.InvalidWorkerAlgorithm',
      {algorithm: options.algorithm}));
  }

  if(options.id) {
    query.id = payswarm.db.hash(options.id);
  }

  payswarm.logger.debug(
    'running payment token worker (' + workerId + ') to find ' +
    (options.algorithm === 'verify' ? 'unverified' : 'expired') +
    ' payment token' + (options.id ? (' ' + options.id) : 's') + '...');

  // single update and new record retrieval db write options
  var singleUpdate = payswarm.tools.extend(
    {}, payswarm.db.writeOptions, {upsert: false, multi: false});

  // run algorithm on all matching entries
  var done = false;
  async.until(function() {return done;}, function(loopCallback) {
    async.waterfall([
      function(callback) {
        // fetch a single token at a time
        payswarm.db.collections.paymentToken.findOne(
          query, {}, callback);
      },
      function(record, callback) {
        if(record === null) {
          if(options.id) {
            // error when token isn't found and a specific ID was given
            return callback(new PaySwarmError(
              'PaymentToken not found.',
              MODULE_TYPE + '.PaymentTokenNotFound'));
          }
          // done, no matching payment tokens remain
          done = true;
          return loopCallback();
        }

        if(options.algorithm === 'verify') {
          // if not ready to verify, ensure withdrawals have settled
          if(record.meta.verify && !record.paymentToken.psaVerifyReady) {
            return _checkVerifyTransactions(
              record.meta, function(err, settled) {
              if(!err && settled) {
                record.paymentToken.psaVerifyReady = true;
              }
              callback(null, record);
            });
          }
        }
        callback(null, record);
      },
      function(record, callback) {
        if(options.algorithm === 'remove') {
          payswarm.db.collections.paymentToken.remove(
            {id: record.id}, payswarm.db.writeOptions, callback);
        }
        else if(options.algorithm === 'verify') {
          // touch payment token to unidle it (set ready flag if appropriate)
          var update = {$set: {'meta.updated': now}};
          if(record.meta.verify && record.paymentToken.psaVerifyReady) {
            update.$set['paymentToken.psaVerifyReady'] = true;
          }
          payswarm.db.collections.paymentToken.update(
            {id: record.id}, update, singleUpdate, function(err) {
            if(err) {
              return callback(err);
            }
            // if no verification data, skip
            if(!record.meta.verify) {
              return loopCallback();
            }

            // send event
            var token = record.paymentToken;
            payswarm.events.emit({
              type: 'common.PaymentToken.unverified',
              details: {
                fetchIdentity: true,
                fetchProfile: true,
                identityId: token.owner,
                paymentToken: token
              }
            });

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
      payswarm.logger.error(
        'error while scanning for ' +
        (options.algorithm === 'verify' ? 'unverified' : 'expired') +
        ' payment tokens', {error: err});
    }
    payswarm.logger.debug('payment token worker (' + workerId + ') finished.');

    if(options.reschedule) {
      // reschedule worker if requested
      payswarm.logger.debug(
        'rescheduling payment token worker in ' + options.reschedule + ' ms');
      setTimeout(function() {
        var event = {type: EVENT_SCAN, details: {algorithm: options.algorithm}};
        payswarm.events.emit(event);
      }, options.reschedule);
    }
    if(callback) {
      callback(err);
    }
  });
}

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    id: PERMISSIONS.PTOKEN_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Payment Token Administration',
    comment: 'Required to administer Payment Tokens.'
  }, {
    id: PERMISSIONS.PTOKEN_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Payment Token',
    comment: 'Required to access a Payment Token.'
  }, {
    id: PERMISSIONS.PTOKEN_CREATE,
    psaModule: MODULE_IRI,
    label: 'Create Payment Token',
    comment: 'Required to create a Payment Token.'
  }, {
    id: PERMISSIONS.PTOKEN_EDIT,
    psaModule: MODULE_IRI,
    label: 'Edit Payment Token',
    comment: 'Required to edit a Payment Token.'
  }, {
    id: PERMISSIONS.PTOKEN_REMOVE,
    psaModule: MODULE_IRI,
    label: 'Remove Payment Token',
    comment: 'Required to remove a Payment Token.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
