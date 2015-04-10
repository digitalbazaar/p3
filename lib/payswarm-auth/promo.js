/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brDatabase = require('bedrock-mongodb');
var brIdentity = require('bedrock-identity');
var payswarm = {
  financial: require('./financial'),
  logger: bedrock.loggers.get('app'),
  tools: require('./tools')
};
var BedrockError = bedrock.util.BedrockError;

// constants
var MODULE_NS = 'payswarm.promo';

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// module API
var api = {};
api.name = MODULE_NS;
module.exports = api;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      // open all necessary collections
      brDatabase.openCollections(['promo', 'promoCodeRedemption'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      brDatabase.createIndexes([{
        collection: 'promo',
        fields: {'promo.promoCode': 1},
        options: {unique: true, background: true}
      }, {
        collection: 'promoCodeRedemption',
        fields: {'redemption.promoCode': 1, 'redemption.email': 1},
        options: {unique: true, background: true}
      }], callback);
    }
  ], callback);
});

/**
 * Creates a promotion that is redeemable via a promo code.
 *
 * @param actor the Identity performing the action.
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
      brIdentity.checkPermission(
        actor, PERMISSIONS.PROMO_CREATE, {resource: actor}, callback);
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
        promo: bedrock.util.extend({
          email: null,
          redeemed: 0,
          title: '',
          description: ''
        }, promo)
      };
      brDatabase.collections.promo.insert(
        record, brDatabase.writeOptions, function(err, result) {
          if(err) {
            if(brDatabase.isDuplicateError(err)) {
              err = new BedrockError(
                'The promotional code already exists.',
                MODULE_NS + '.PromoCodeDuplicate',
                {'public': true, httpStatusCode: 400,
                  promoCode: promo.promoCode});
            }
            return callback(err);
          }
          callback(null, result.ops[0]);
        });
    }
  ], callback);
};

/**
 * Retrieves all Promos matching the given query.
 *
 * @param actor the Identity performing the action.
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
        actor, PERMISSIONS.PROMO_ADMIN, callback);
    },
    function(callback) {
      brDatabase.collections.promo.find(
        query, fields, options).toArray(callback);
    }
  ], callback);
};

/**
 * Retrieves a Promo.
 *
 * @param actor the Identity performing the action.
 * @param promoCode the promo code of the Promo to retrieve.
 * @param callback(err, promo, meta) called once the operation completes.
 */
api.getPromo = function(actor, promoCode, callback) {
  async.waterfall([
    function(callback) {
      brDatabase.collections.promo.findOne(
        {'promo.promoCode': promoCode}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        return callback(new BedrockError(
          'Promotion not found.',
          MODULE_NS + '.PromotionNotFound',
          {'public': true, httpStatusCode: 404, promoCode: promoCode}));
      }
      callback(null, record.promo, record.meta);
    },
    function(promo, meta, callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PROMO_ACCESS, {resource: actor}, function(err) {
          if(err && err.name === 'bedrock.permission.PermissionDenied') {
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
 * @param actor the Identity performing the action.
 * @param redemption the redemption information:
 *          promoCode the promo code to redeem.
 *          account the ID of the financial account to deposit any
 *            promotional funds into.
 *          [email] the email address to redeem the promo code with, defaults
 *            to the default email for Identity that owns the given account.
 * @param callback(err, promo) called once the operation completes.
 */
api.redeemCode = function(actor, redemption, callback) {
  redemption = bedrock.util.extend({}, redemption);
  async.waterfall([
    function(callback) {
      brIdentity.checkPermission(
        actor, PERMISSIONS.PROMO_REDEEM_CODE, {resource: actor}, callback);
    },
    function(callback) {
      payswarm.financial.getAccount(actor, redemption.account, callback);
    },
    function(account, meta, callback) {
      redemption.identity = account.owner;
      brIdentity.getIdentity(actor, redemption.identity, callback);
    },
    function(identity, meta, callback) {
      redemption.email = redemption.email || identity.email;
      if(identity.email !== redemption.email) {
        return callback(new BedrockError(
          'Could not redeem the promotional code; the given email address is ' +
          'not associated with the given Identity.',
          MODULE_NS + '.PromoCodeEmailConflict', {
            'public': true,
            httpStatusCode: 400,
            redemption: redemption
          }));
      }
      callback();
    },
    function(callback) {
      brDatabase.collections.promoCodeRedemption.findOne(
        {'redemption.promoCode': redemption.promoCode,
          'redemption.email': redemption.email},
        {'redemption.promoCode': true}, callback);
    },
    function(record, callback) {
      if(record) {
        // code already redeemed
        return callback(new BedrockError(
          'The promotional code has already been redeemed.',
          MODULE_NS + '.PromoCodeAlreadyRedeemed',
          {'public': true, httpStatusCode: 400, redemption: redemption}));
      }
      // FIXME: fetch account, check currency against currency in promo
      // deposits

      // decrement redeemable uses of promo code if it exists, there are uses
      // redeemable, it has not expired, and there is no email the code is
      // locked to or that email is the one being used here
      brDatabase.collections.promo.update(
        {'promo.promoCode': redemption.promoCode, 'promo.redeemable': {$gt: 0},
          expires: {$gt: +new Date()},
          $or: [{'promo.email': null}, {'promo.email': redemption.email}]},
        {$inc: {'promo.redeemable': -1, 'promo.redeemed': 1}},
        brDatabase.writeOptions, callback);
    },
    function(result, callback) {
      if(result.n === 0) {
        // no such promo code/not redeemable
        return callback(new BedrockError(
          'The promotional code was not found or is no longer redeemable.',
          MODULE_NS + '.PromoCodeNotFound',
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
      brDatabase.collections.promoCodeRedemption.insert(
        record, brDatabase.writeOptions, function(err, result) {
          if(err && brDatabase.isDuplicateError(err)) {
            // promo code redeeming race condition detected, reincrement
            // redeemable # of codes and recurse to return error condition
            return brDatabase.collections.promo.update(
              {'promo.promoCode': redemption.promoCode},
              {$inc: {'promo.redeemable': 1, 'promo.redeemed': -1}},
              brDatabase.writeOptions, function(err) {
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
      brDatabase.collections.promo.findOne(
        {'promo.promoCode': redemption.promoCode}, {}, callback);
    },
    function(record, callback) {
      if(!record) {
        // no such promo code/not redeemable
        return callback(new BedrockError(
          'The promotional code was not found or is no longer redeemable.',
          MODULE_NS + '.PromoCodeNotFound',
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
              source: bedrock.config.promo.paymentToken,
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
