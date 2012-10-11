/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var assert = require('assert');
var payswarm = {
  money: require('./money'),
  tools: require('./tools')
};
var Money = payswarm.money.Money;

module.exports = {
  'when applying an exclusive 2% to $1': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination',
        payeeGroup: ['vendor'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination',
        payeeGroup: ['authority'],
        payeeApplyGroup: ['vendor'],
        payeeExemptGroup: ['authority'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '2.00'
      }];
      var txn = {id: '1'};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get $1.02': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('1.02');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    }
  }
};
