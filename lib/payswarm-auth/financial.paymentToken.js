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

// sub module API
var api = {};
module.exports = api;

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
      }], callback);
    },
    _registerPermissions,
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
 * Creates a payment token for the given source of funds (eg: CreditCard or
 * BankAccount), if supported by the gateway given by the 'gateway' option. If
 * tokenization is not supported by the gateway, the returned PaymentToken will
 * be null. The token must also specify 'owner' and 'label'. The
 * token's ID will be auto-generated based on its property label unless
 * the 'generateId' option is specifically set to false and an 'id' field
 * is present in the token.
 *
 * @param actor the Profile performing the action.
 * @param options the options to use.
 *          source the source of funds (eg: CreditCard, BankAccount).
 *          gateway the gateway to generate the token from.
 *          token the PaymentToken with custom information to store.
 *          generateId true to generate an ID from the token's label, false
 *            to use the given token's ID (default: true).
 * @param callback(err, token) called once the operation completes.
 */
api.createPaymentToken = function(actor, options, callback) {
  if(!('generateId' in options) || !options.token.id) {
    options.generateId = true;
  }
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
      // create token via gateway
      gateway = payswarm.financial.paymentGateways[gateway];
      gateway.createPaymentToken(source, token, callback);
    },
    function(token, callback) {
      if(options.generateId) {
        // generate ID for token
        _generatePaymentTokenId(token);
      }

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

      // try to insert record, adding a counter to the ID until it is unique
      var base = token.id;
      var count = 1;
      var inserted = false;
      async.until(function() {return inserted;}, function(callback) {
        payswarm.db.collections.paymentToken.insert(
          record, payswarm.db.writeOptions, function(err) {
            inserted = !err;
            if(err && payswarm.db.isDuplicateError(err)) {
              if(!options.generateId) {
                return callback(err);
              }
              token.id = base + (count++);
              record.id = payswarm.db.hash(token.id);
              err = null;
            }
            callback(err);
          });
      },
      function(err) {
        callback(err, token);
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

        // create token
        var token = {
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
 * Removes a PaymentToken.
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
      payswarm.db.collections.paymentToken.remove(
        {id: payswarm.db.hash(id)},
        payswarm.db.writeOptions,
        callback);
    }
  ], callback);
};

/**
 * Verifies a PaymentToken.
 *
 * @param actor the Profile performing the action.
 * @param id the ID of the PaymentToken to verify.
 * @param callback(err) called once the operation completes.
 */
api.verifyPaymentToken = function(actor, id, callback) {
  // FIXME: implement me
};

/**
 * Generates a PaymentToken ID. The ID will be assigned to the 'id' property
 * of the given token.
 *
 * @param token the PaymentToken to generate an ID for.
 */
function _generatePaymentTokenId(token) {
  token.id = api.createPaymentTokenId(token.owner, token.label);
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
