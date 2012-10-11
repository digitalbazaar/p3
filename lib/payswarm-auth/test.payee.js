/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var assert = require('assert');
var jsonld = require('jsonld');
var payswarm = {
  money: require('./money'),
  tools: require('./tools')
};
var _ = require('underscore');
var Money = payswarm.money.Money;

module.exports = {
  'when applying an exclusive 2% to $1': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination1',
        payeeGroup: ['a'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination2',
        payeeGroup: ['b'],
        payeeApplyGroup: ['a'],
        payeeExemptGroup: ['b'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '2.00'
      }];
      var txn = {id: '1'};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $1.02': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('1.02');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    },
    'we get two transfers': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $1': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: "urn:destination1",
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.02': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('0.02');
      var xfer = _.where(xfers, {
        destination: "urn:destination2",
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying an inclusive 2% to $1': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination',
        payeeGroup: ['a'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination',
        payeeGroup: ['b'],
        payeeApplyGroup: ['a'],
        payeeExemptGroup: ['b'],
        payeeRateType: 'com:PercentInclusive',
        payeeRate: '2.00'
      }];
      var txn = {id: '1'};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $1.00': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('1.00');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    }
  }
};
