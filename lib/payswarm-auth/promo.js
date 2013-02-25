/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var payswarm = {
  config: require('../config'),
  db: require('./database'),
  financial: require('./financial'),
  logger: require('./loggers').get('app'),
  tools: require('./tools')
};
var util = require('util');
var PaySwarmError = payswarm.tools.PaySwarmError;

// constants
var MODULE_TYPE = 'payswarm.promo';
var MODULE_IRI = 'https://payswarm.com/modules/promo';

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
      payswarm.db.openCollections(['promo'], callback);
    },
    function(callback) {
      // setup collections (create indexes, etc)
      payswarm.db.createIndexes([{
        collection: 'promo',
        fields: {code: 1, claimed: 1},
        options: {unique: false, background: true}
      }, {
        collection: 'promo',
        fields: {email: 1, claimed: 1},
        options: {unique: false, background: true}
      }], callback);
    }
  ], callback);
};

/**
 * Claims a promo code.
 *
 * @param code the promo code to claim.
 * @param profileId the ID of the Profile to claim the promo code for.
 * @param email the email address of the Profile to claim the promo code for.
 * @param identityId the ID of the identity to associate with the claim.
 * @param accountId the ID of the financial account to deposit any promotional
 *          funds into.
 * @param callback(err) called once the operation completes.
 */
api.claimCode = function(
  code, profileId, email, identityId, accountId, callback) {
  async.waterfall([
    function(callback) {
      // claim a single promo code
      payswarm.db.collections.promo.update(
        {code: code, claimed: false},
        {$set: {
          claimed: new Date(),
          email: email,
          profile: profileId,
          identity: identityId,
          account: accountId
        }},
        payswarm.tools.extend({}, payswarm.db.writeOptions, {multi: false}),
        callback);
    },
    function(n, info, callback) {
      if(n === 0) {
        // no such promo code
        return callback(new PaySwarmError(
          'Promotion code not found.',
          MODULE_TYPE + '.PromoCodeNotFound',
          {code: code}));
      }
      callback();
    },
    function(callback) {
      // get code deposits
      payswarm.db.collections.promo.findOne(
        {code: code}, {deposits: true}, callback);
    },
    function(record, callback) {
      if(!record || record.deposits.length === 0) {
        return callback();
      }

      // create deposit for each entry
      async.forEachSeries(record.deposits, function(entry, callback) {
        async.waterfall([
          function(callback) {
            var deposit = {
              '@context': 'http://purl.org/payswarm/v1',
              type: ['Transaction', 'Deposit'],
              payee: [{
                type: 'Payee',
                payeeGroup: ['deposit'],
                payeeRate: entry.amount,
                payeeRateType: 'FlatAmount',
                payeeApplyType: 'ApplyExclusively',
                destination: accountId,
                currency: 'USD',
                comment: entry.comment || 'Promotional Funds'
              }],
              source: payswarm.config.promo.paymentToken
            };
            payswarm.financial.signDeposit(null, deposit, callback);
          },
          function(deposit, callback) {
            payswarm.financial.processDeposit(null, deposit, callback);
          }
        ], function(err) {
          callback(err);
        });
      }, callback);
    }
  ], callback);
};

/**
 * Gets any unclaimed code associated with an email address. If the code
 * returned via the callback is null, then there is no unclaimed code.
 *
 * @param email the email address to get the unclaimed code for.
 * @param callback(err, code) called once the operation completes.
 */
api.getUnclaimedCode = function(email, callback) {
  async.waterfall([
    function(callback) {
      payswarm.db.collections.promo.findOne(
        {email: email, claimed: false}, {code: true}, callback);
    },
    function(record, callback) {
      callback(null, record ? record.code : null);
    }
  ], callback);
};
