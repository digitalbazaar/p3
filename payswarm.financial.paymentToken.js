/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('./payswarm.config'),
  db: require('./payswarm.database'),
  identity: require('./payswarm.identity'),
  logger: require('./payswarm.logger'),
  permission: require('./payswarm.permission'),
  profile: require('./payswarm.profile'),
  security: require('./payswarm.security')
};

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
    _registerPermissions
  ], callback);
};

/**
 * Creates a payment token for the given source of funds (eg: CreditCard or
 * BankAccount), if supported by the given gateway. If tokenization is not
 * supported by the gateway, the returned PaymenToken will be null.
 *
 * @param actor the Profile performing the action.
 * @param source the source of funds (eg: CreditCard, BankAccount).
 * @param gateway the gateway to create the token with.
 * @param token the PaymentToken with custom information to store.
 * @param callback(err, token) called once the operation completes.
 */
api.createPaymentToken = function(actor, source, gateway, token, callback) {
  // FIXME: implement me
};

/**
 * Gets the PaymentToken by token ID.
 *
 * @param actor the Profile performing the action.
 * @param token the PaymentToken to populate, with its token and owner set.
 *
 * @return true on success, false on failure with exception set.
 */
virtual bool getPaymentToken(
   payswarm::common::Profile& actor,
   payswarm::common::PaymentToken& token) = 0;

/**
 * Gets all the PaymentTokens for the given identity.
 *
 * The query must contain "ps:owner" and may optionally contain:
 *
 * "com:gateway": The gateway for the tokens.
 *
 * @param actor the Profile performing the action.
 * @param query the query for getting payment tokens.
 * @param tokens the list to populate with payment tokens.
 *
 * @return true on success, false on failure with exception set.
 */
virtual bool getPaymentTokens(
   payswarm::common::Profile& actor,
   monarch::rt::DynamicObject& query,
   monarch::rt::DynamicObject& tokens) = 0;

/**
 * Adds a new PaymentToken. The PaymentToken's ID will be generated based
 * on its label.
 *
 * @param actor the Profile performing the action.
 * @param token the PaymentToken to add.
 * @param changeIdOnDuplicate true to generate a new ID if the PaymentToken
 *           is a duplicate.
 *
 * @return true on success, false on failure with exception set.
 */
virtual bool addPaymentToken(
   payswarm::common::Profile& actor,
   payswarm::common::PaymentToken& token,
   bool changeIdOnDuplicate = true) = 0;

/**
 * Updates an existing PaymentToken.
 *
 * @param actor the Profile performing the action.
 * @param token the PaymentToken to update.
 *
 * @return true on success, false on failure with exception set.
 */
virtual bool updatePaymentToken(
   payswarm::common::Profile& actor,
   payswarm::common::PaymentToken& token) = 0;

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
      if('ps:owner' in paymentToken) {
        callback(null, paymentToken);
      }
      else {
        api.getPaymentToken(actor, paymentToken['@id'],
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
    '@id': PERMISSIONS.PTOKEN_ADMIN,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Payment Token Administration',
    'rdfs:comment': 'Required to administer Payment Tokens.'
  }, {
    '@id': PERMISSIONS.PTOKEN_ACCESS,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Access Payment Token',
    'rdfs:comment': 'Required to access a Payment Token.'
  }, {
    '@id': PERMISSIONS.PTOKEN_CREATE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Create Payment Token',
    'rdfs:comment': 'Required to create a Payment Token.'
  }, {
    '@id': PERMISSIONS.PTOKEN_EDIT,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Edit Payment Token',
    'rdfs:comment': 'Required to edit a Payment Token.'
  }, {
    '@id': PERMISSIONS.PTOKEN_REMOVE,
    'psa:module': MODULE_IRI,
    'rdfs:label': 'Remove Payment Token',
    'rdfs:comment': 'Required to remove a Payment Token.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
