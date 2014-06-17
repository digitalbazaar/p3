/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var payswarm = {
  config: bedrock.config,
  db: bedrock.modules['bedrock.database'],
  financial: require('./financial'),
  identity: require('./identity'),
  logger: require('./loggers').get('app'),
  permission: require('./permission'),
  profile: require('./profile'),
  tools: require('./tools')
};
var util = require('util');
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.promo';
var MODULE_IRI = 'https://payswarm.com/modules/promo';

// module permissions
var PERMISSIONS = {
  PROMO_ADMIN: MODULE_IRI + '#promo_admin',
  PROMO_ACCESS: MODULE_IRI + '#promo_access',
  PROMO_CREATE: MODULE_IRI + '#promo_create',
  PROMO_EDIT: MODULE_IRI + '#promo_edit',
  PROMO_REMOVE: MODULE_IRI + '#promo_remove',
  PROMO_REDEEM_CODE: MODULE_IRI + '#promo_redeem_code'
};

// module API
var api = {};
api.name = MODULE_TYPE + '.Promo';
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
      // open all necessary collections
      payswarm.db.openCollections(['promo', 'promoCodeRedemption'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'promo',
        fields: {'promo.promoCode': 1},
        options: {unique: true, background: true}
      }, {
        collection: 'promoCodeRedemption',
        fields: {'redemption.promoCode': 1, 'redemption.email': 1},
        options: {unique: true, background: true}
      }], callback);
    },
    _registerPermissions
  ], callback);
};

/**
 * Creates a promotion that is redeemable via a promo code.
 *
 * @param actor the Profile performing the action.
 * @param promo the promotion:
 *          promoCode the promotional code (must be unique).
 *          expires the expiration date (as a w3c date string).
 *          redeemable how many times the promotional code can be redeemed.
 *          deposit an array with the amounts and comments for the deposits:
 *            amount the amount to deposit.
 *            currency the currency for the amount.
 *            comment the comment to appear for the deposit.
 *          [title] an optional title for the promotion.
 *          [description] an optional description for the promotion.
 *          [email] an optional email address to lock the promo code to.
 * @param callback(err, record) called once the operation completes.
 */
api.createPromo = function(actor, promo, callback) {
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.PROMO_CREATE, callback);
    },
    function(callback) {
      // FIXME: ensure currency is the same in every deposit in promo

      // create new promo code
      var now = +new Date();
      var record = {
        expires: +new Date(promo.expires),
        meta: {
          created: now,
          updated: now
        },
        promo: payswarm.tools.extend({
          email: null,
          redeemed: 0,
          title: '',
          description: ''
        }, promo)
      };
      payswarm.db.collections.promo.insert(
        record, payswarm.db.writeOptions, function(err, records) {
          if(err) {
            if(payswarm.db.isDuplicateError(err)) {
              err = new PaySwarmError(
                'The promotional code already exists.',
                MODULE_TYPE + '.PromoCodeDuplicate',
                {'public': true, httpStatusCode: 400,
                  promoCode: promo.promoCode});
            }
            return callback(err);
          }
          callback(null, records[0]);
        });
    }
  ], callback);
};

/**
 * Retrieves all Promos matching the given query.
 *
 * @param actor the Profile performing the action.
 * @param [query] the optional query to use (default: {}).
 * @param [fields] optional fields to include or exclude (default: {}).
 * @param [options] options (eg: 'sort', 'limit').
 * @param callback(err, records) called once the operation completes.
 */
api.getPromos = function(actor, query, fields, options, callback) {
  // handle args
  if(typeof query === 'function') {
    callback = query;
    query = null;
    fields = null;
  }
  else if(typeof fields === 'function') {
    callback = fields;
    fields = null;
  }
  else if(typeof options === 'function') {
    callback = options;
    options = null;
  }

  query = query || {};
  fields = fields || {};
  options = options || {};
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.PROMO_ADMIN, callback);
    },
    function(callback) {
      payswarm.db.collections.promo.find(
        query, fields, options).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves a Promo.
 *
 * @param actor the Profile performing the action.
 * @param promoCode the promo code of the Promo to retrieve.
 * @param callback(err, promo, meta) called once the operation completes.
 */
api.getPromo = function(actor, promoCode, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.promo.findOne(
        {'promo.promoCode': promoCode}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new PaySwarmError(
          'Promotion not found.',
          MODULE_TYPE + '.PromotionNotFound',
          {'public': true, httpStatusCode: 404, promoCode: promoCode}));
      }
      callback(null, record.promo, record.meta);
    },
    function(promo, meta, callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.PROMO_ACCESS, function(err) {
          if(err && err.name === 'payswarm.permission.PermissionDenied') {
            // only show public information
            err = null;
            promo = {
              promoCode: promo.promoCode,
              expires: promo.expires,
              title: promo.title,
              description: promo.description,
              deposit: promo.deposit,
              redeemable: promo.redeemable
            };
          }
          callback(err, promo, meta);
        });
    }
  ], callback);
};

/**
 * Redeems a promo code using an email address.
 *
 * @param actor the Profile performing the action.
 * @param redemption the redemption information:
 *          promoCode the promo code to redeem.
 *          [email] the email address to redeem the promo code with, defaults
 *            to the default email for Profile that owns the given account.
 *          account the ID of the financial account to deposit any
 *            promotional funds into.
 * @param callback(err, promo) called once the operation completes.
 */
api.redeemCode = function(actor, redemption, callback) {
  redemption = payswarm.tools.extend({}, redemption);
  async.waterfall([
    function(callback) {
      payswarm.profile.checkActorPermission(
        actor, PERMISSIONS.PROMO_REDEEM_CODE, callback);
    },
    function(callback) {
      payswarm.financial.getAccount(actor, redemption.account, callback);
    },
    function(account, meta, callback) {
      redemption.identity = account.owner;
      payswarm.identity.getIdentity(actor, redemption.identity, callback);
    },
    function(identity, meta, callback) {
      redemption.profile = identity.owner;
      payswarm.profile.getProfile(actor, identity.owner, callback);
    },
    function(profile, meta, callback) {
      redemption.email = redemption.email || profile.email;
      if(profile.email !== redemption.email) {
        return callback(new PaySwarmError(
          'Could not redeem the promotional code; the given email address is ' +
          'not associated with the given Profile.',
          MODULE_TYPE + '.PromoCodeEmailConflict', {
            'public': true,
            httpStatusCode: 400,
            redemption: redemption
          }));
      }
      callback();
    },
    function(callback) {
      payswarm.db.collections.promoCodeRedemption.findOne(
        {'redemption.promoCode': redemption.promoCode,
          'redemption.email': redemption.email},
        {'redemption.promoCode': true}, callback);
    },
    function(record, callback) {
      if(record) {
        // code already redeemed
        return callback(new PaySwarmError(
          'The promotional code has already been redeemed.',
          MODULE_TYPE + '.PromoCodeAlreadyRedeemed',
          {'public': true, httpStatusCode: 400, redemption: redemption}));
      }
      // FIXME: fetch account, check currency against currency in promo
      // deposits

      // decrement redeemable uses of promo code if it exists, there are uses
      // redeemable, it has not expired, and there is no email the code is
      // locked to or that email is the one being used here
      payswarm.db.collections.promo.update(
        {'promo.promoCode': redemption.promoCode, 'promo.redeemable': {$gt: 0},
          expires: {$gt: +new Date()},
          $or: [{'promo.email': null}, {'promo.email': redemption.email}]},
        {$inc: {'promo.redeemable': -1, 'promo.redeemed': 1}},
        payswarm.db.writeOptions, callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        // no such promo code/not redeemable
        return callback(new PaySwarmError(
          'The promotional code was not found or is no longer redeemable.',
          MODULE_TYPE + '.PromoCodeNotFound',
          {'public': true, httpStatusCode: 404, redemption: redemption}));
      }
      callback();
    },
    function(callback) {
      // add promo code redemption
      var now = +new Date();
      var record = {
        meta: {
          created: now,
          updated: now
        },
        redemption: redemption
      };
      payswarm.db.collections.promoCodeRedemption.insert(
        record, payswarm.db.writeOptions, function(err, records) {
          if(err && payswarm.db.isDuplicateError(err)) {
            // promo code redeeming race condition detected, reincrement
            // redeemable # of codes and recurse to return error condition
            return payswarm.db.collections.promo.update(
              {'promo.promoCode': redemption.promoCode},
              {$inc: {'promo.redeemable': 1, 'promo.redeemed': -1}},
              payswarm.db.writeOptions, function(err) {
                if(err) {
                  payswarm.logger.error(
                    'Could not re-increment the number of redeemable uses of ' +
                    'a promotional code after a race condition for a ' +
                    'particular redeemer was detected. This is non-fatal ' +
                    'error.', {error: err, redemption: redemption});
                }
                api.redeemCode(actor, redemption, callback);
              });
          }
          if(err) {
            return callback(err);
          }
          callback();
        });
    },
    function(callback) {
      // get promo
      payswarm.db.collections.promo.findOne(
        {'promo.promoCode': redemption.promoCode}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        // no such promo code/not redeemable
        return callback(new PaySwarmError(
          'The promotional code was not found or is no longer redeemable.',
          MODULE_TYPE + '.PromoCodeNotFound',
          {'public': true, httpStatusCode: 404, redemption: redemption}));
      }

      // create deposit for each entry
      var promo = record.promo;
      async.forEachSeries(promo.deposit, function(entry, callback) {
        async.waterfall([
          function(callback) {
            var deposit = {
              '@context': 'https://w3id.org/payswarm/v1',
              type: ['Transaction', 'Deposit'],
              payee: [{
                type: 'Payee',
                payeeGroup: ['deposit'],
                payeeRate: entry.amount,
                payeeRateType: 'FlatAmount',
                payeeApplyType: 'ApplyExclusively',
                destination: redemption.account,
                currency: 'USD',
                comment: entry.comment || 'Promotional Funds'
              }],
              source: payswarm.config.promo.paymentToken,
              triggerReason: 'Promotion'
            };
            payswarm.financial.signDeposit(null, deposit, callback);
          },
          function(deposit, callback) {
            payswarm.financial.processDeposit(null, deposit, callback);
          }
        ], function(err) {
          callback(err);
        });
      }, function(err) {
        callback(err, promo);
      });
    }
  ], callback);
};

/**
 * Registers the permissions for this module.
 *
 * @param callback(err) called once the operation completes.
 */
function _registerPermissions(callback) {
  var permissions = [{
    id: PERMISSIONS.PROMO_ADMIN,
    psaModule: MODULE_IRI,
    label: 'Promotion Administration',
    comment: 'Required to administer Promotions.'
  }, {
    id: PERMISSIONS.PROMO_ACCESS,
    psaModule: MODULE_IRI,
    label: 'Access Promotion',
    comment: 'Required to access a Promotion.'
  }, {
    id: PERMISSIONS.PROMO_CREATE,
    psaModule: MODULE_IRI,
    label: 'Create Promotion',
    comment: 'Required to create a Promotion.'
  }, {
    id: PERMISSIONS.PROMO_EDIT,
    psaModule: MODULE_IRI,
    label: 'Edit Promotion',
    comment: 'Required to edit a Promotion.'
  }, {
    id: PERMISSIONS.PROMO_REMOVE,
    psaModule: MODULE_IRI,
    label: 'Remove Promotion',
    comment: 'Required to remove a Promotion.'
  }, {
    id: PERMISSIONS.PROMO_REDEEM_CODE,
    psaModule: MODULE_IRI,
    label: 'Redeem a Promotional Code',
    comment: 'Required to redeem a Promotional Code.'
  }];
  async.forEach(permissions, function(p, callback) {
    payswarm.permission.registerPermission(p, callback);
  }, callback);
}
