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

// convert money string into a normalized string for use in assert calls
function _m(ms) {
  return new Money(ms).toString();
}

module.exports = {
  'when applying a $1 flat amount payee': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination1',
        payeeGroup: ['a'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $1.00': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('1.00');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    },
    'we get one transfer': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 1);
    },
    'we get one transfer of $1': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying an exclusive 2% payee to $1': {
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
      var txn = {};
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
        destination: 'urn:destination1',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.02': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('0.02');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying an inclusive 2% payee to $1': {
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
        payeeRateType: 'com:PercentInclusive',
        payeeRate: '2.00'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $1.00': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('1.00');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    },
    'we get two transfers': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $0.98': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('0.98');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.02': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('0.02');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying a flat amount to one payee but not another': {
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
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination3',
        payeeGroup: ['c'],
        payeeApplyGroup: ['a'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.50'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $2.50': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('2.50');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    },
    'we get three transfers': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.50': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('0.50');
      var xfer = _.where(xfers, {
        destination: 'urn:destination3',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying a flat amount to one payee but exempting another': {
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
        payeeGroup: ['a', 'exempt'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination3',
        payeeGroup: ['c'],
        payeeApplyGroup: ['a'],
        payeeExemptGroup: ['exempt'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.50'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $2.50': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('2.50');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.50': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('0.50');
      var xfer = _.where(xfers, {
        destination: 'urn:destination3',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying selective tax rates': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination1',
        payeeGroup: ['untaxed'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination2',
        payeeGroup: ['taxed'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination3',
        payeeApplyGroup: ['taxed'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '4.5'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $2.045': function(err, txn) {
      assert.isNull(err);
      var expect = new Money('2.045');
      var amount = new Money(txn.amount);
      assert.equal(expect.compareTo(amount), 0);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('1.00');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.045': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var amount = new Money('0.045');
      var xfer = _.where(xfers, {
        destination: 'urn:destination3',
        amount: amount.toString()
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when creating group loops': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination1',
        payeeGroup: ['assets'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax1',
        payeeGroup: ['taxes'],
        // LOOP w/o apply group
        //payeeApplyGroup: ['assets'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '5'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax2',
        payeeGroup: ['taxes'],
        // LOOP w/o apply group
        //payeeApplyGroup: ['assets'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '10'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a loop error': function(err, txn) {
      assert.isNotNull(err);
      var eobj = err.toObject();
      assert.equal('payswarm.financial.CyclicalPayeeDependency', eobj.type);
    }
  },
  'when applying fees and taxes': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination1',
        payeeGroup: ['assets'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees1',
        payeeGroup: ['fees'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.30'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees1',
        payeeGroup: ['fees'],
        payeeApplyGroup: ['assets'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '2.5'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax1',
        payeeGroup: ['taxes'],
        payeeApplyGroup: ['assets'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '5'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax2',
        payeeGroup: ['taxes'],
        payeeApplyGroup: ['assets'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '10'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $1.475': function(err, txn) {
      assert.isNull(err);
      assert.equal(_m('1.475'), _m(txn.amount));
    },
    'we get 5 transfers': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 5);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.30': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees1',
        amount: _m('0.30')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.025': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees1',
        amount: _m('0.025')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one tax of $0.05': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:tax1',
        amount: _m('0.05')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one tax of $0.10': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:tax2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying rate to duplicate groups': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1', 'g2'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeApplyGroup: ['g1', 'g2'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '10'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $1.10': function(err, txn) {
      assert.isNull(err);
      assert.equal(_m('1.10'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.10': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying rate to duplicate groups': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1', 'g2'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeApplyGroup: ['g1', 'g2'],
        payeeRateType: 'com:PercentExclusive',
        payeeRate: '10'
      }];
      var txn = {};
      payswarm.tools.createTransfers(txn, 'urn:source', payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a total of $1.10': function(err, txn) {
      assert.isNull(err);
      assert.equal(_m('1.10'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $1.00': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.10': function(err, txn) {
      assert.isNull(err);
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  }
};
