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

// create base transaction
function _txn() {
  return {
    currency: 'USD'
  };
}

// generic source
var sourceId = 'urn:source';

module.exports = {
  'when no payees': {
    topic: function() {
      var self = this;
      var payees = [];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a zero total': function(err, txn) {
      assert.equal(_m('0'), _m(txn.amount));
    },
    'we get no transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 0);
    }
  },
  'when no payeeRateType': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when invalid payeeRateType': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'INVALID',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when missing payeeGroup': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when missing payeeApplyType': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '1'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when invalid payeeApplyType': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'INVALID',
        payeeRate: '1'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when applying a $1 flat amount payee': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:destination1',
        payeeGroup: ['a'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.00': function(err, txn) {
      assert.equal(_m('1.00'), _m(txn.amount));
    },
    'we get one transfer': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 1);
    },
    'we get one transfer of $1': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('1.00')
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination2',
        payeeGroup: ['b'],
        payeeApplyGroup: ['a'],
        payeeExemptGroup: ['b'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '2.00'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.02': function(err, txn) {
      assert.equal(_m('1.02'), _m(txn.amount));
    },
    'we get two transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $1': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.02': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: _m('0.02')
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination2',
        payeeGroup: ['b'],
        payeeApplyGroup: ['a'],
        payeeExemptGroup: ['b'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '2.00'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.00': function(err, txn) {
      assert.equal(_m('1.00'), _m(txn.amount));
    },
    'we get two transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $0.98': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('0.98')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.02': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: _m('0.02')
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination2',
        payeeGroup: ['b'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination3',
        payeeGroup: ['c'],
        payeeApplyGroup: ['a'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.50'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.50': function(err, txn) {
      assert.equal(_m('2.50'), _m(txn.amount));
    },
    'we get three transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get one transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d2 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d3 transfer of $0.50': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination3',
        amount: _m('0.50')
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination2',
        payeeGroup: ['a', 'exempt'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination3',
        payeeGroup: ['c'],
        payeeApplyGroup: ['a'],
        payeeExemptGroup: ['exempt'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.50'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.50': function(err, txn) {
      assert.equal(_m('2.50'), _m(txn.amount));
    },
    'we get one d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d2 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $0.50': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination3',
        amount: _m('0.50')
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination2',
        payeeGroup: ['taxed'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:destination3',
        payeeGroup: ['d3'],
        payeeApplyGroup: ['taxed'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '4.5'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.045': function(err, txn) {
      assert.equal(_m('2.045'), _m(txn.amount));
    },
    'we get one d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d2 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination2',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d3 transfer of $0.045': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination3',
        amount: _m('0.045')
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax1',
        payeeGroup: ['taxes'],
        // Loop test w/o apply group
        //payeeApplyGroup: ['assets'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '5'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax2',
        payeeGroup: ['taxes'],
        // Loop test w/o apply group
        //payeeApplyGroup: ['assets'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get a dependency error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal(
        'payswarm.financial.InvalidPayeeDependency', err.toObject().type);
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees1',
        payeeGroup: ['fees'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.30'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees1',
        payeeGroup: ['fees'],
        payeeApplyGroup: ['assets'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '2.5'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax1',
        payeeGroup: ['taxes'],
        payeeApplyGroup: ['assets'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '5'
      }, {
        type: 'com:Payee',
        destination: 'urn:tax2',
        payeeGroup: ['taxes'],
        payeeApplyGroup: ['assets'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.475': function(err, txn) {
      assert.equal(_m('1.475'), _m(txn.amount));
    },
    'we get 5 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 5);
    },
    'we get one transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:destination1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.30': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees1',
        amount: _m('0.30')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.025': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees1',
        amount: _m('0.025')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one tax of $0.05': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:tax1',
        amount: _m('0.05')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one tax of $0.10': function(err, txn) {
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
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['d2'],
        payeeApplyGroup: ['g1', 'g2'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.10': function(err, txn) {
      assert.equal(_m('1.10'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.10': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying rate to a group twice': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['d2'],
        payeeApplyGroup: ['g1', 'g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.10': function(err, txn) {
      assert.equal(_m('1.10'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one fee of $0.10': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when creating zero value transfers': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:remainder',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '2'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '100'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.00': function(err, txn) {
      assert.equal(_m('2.00'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get no remainder': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:remainder',
        amount: _m('0')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one transfer of $2.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('2')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when splitting a flat fee with no remainder (group cascade)': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:remainder',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '2.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '100'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['d2'],
        payeeApplyGroup: ['d1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '50'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.00': function(err, txn) {
      assert.equal(_m('2.00'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get no remainder': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:remainder',
        amount: _m('0')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d2 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('1')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when splitting a flat fee with no remainder': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:remainder',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '2.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '50'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['d2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '50'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.00': function(err, txn) {
      assert.equal(_m('2.00'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get zero remainder': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:remainder',
        amount: _m('0')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d2 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when splitting a flat fee with remainder': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:remainder',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '3.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '33'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['d2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '33'
      }, {
        type: 'com:Payee',
        destination: 'urn:d3',
        payeeGroup: ['d3'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '33'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $3.00': function(err, txn) {
      assert.equal(_m('3.00'), _m(txn.amount));
    },
    'we get 4 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 4);
    },
    'we get one remainder transfer of $0.03': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:remainder',
        amount: _m('0.03')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d1 transfer of $0.99': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('0.99')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d2 transfer of $0.99': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.99')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d3 transfer of $0.99': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d3',
        amount: _m('0.99')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying an evenly-divisible flat fee': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:a1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.50'
      }, {
        type: 'com:Payee',
        destination: 'urn:a2',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.50'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '1.00'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.00': function(err, txn) {
      assert.equal(_m('1.00'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get one a1 transfer of $0.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a1',
        amount: _m('0')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one a2 transfer of $0.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a2',
        amount: _m('0')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1.00')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying a non-evenly-divisible flat fee': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:a1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.33'
      }, {
        type: 'com:Payee',
        destination: 'urn:a2',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.34'
      }, {
        type: 'com:Payee',
        destination: 'urn:a3',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.33'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '0.99'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.00': function(err, txn) {
      assert.equal(_m('1.00'), _m(txn.amount));
    },
    'we get 4 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 4);
    },
    'we get one a1 transfer of $0.0033': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a1',
        amount: _m('0.0033')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one a2 transfer of $0.0034': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a2',
        amount: _m('0.0034')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one a3 transfer of $0.0033': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a3',
        amount: _m('0.0033')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d1 transfer of $0.99': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('0.99')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying a non-evenly-divisible flat fee to tiny amounts': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:a1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.0000033'
      }, {
        type: 'com:Payee',
        destination: 'urn:a2',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.0000034'
      }, {
        type: 'com:Payee',
        destination: 'urn:a3',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '0.0000033'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '0.0000099'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $0.00001': function(err, txn) {
      assert.equal(_m('0.00001'), _m(txn.amount));
    },
    'we get 4 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 4);
    },
    'we get one a1 transfer of $0.0000001': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a1',
        amount: _m('0.0000001')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one a2 transfer of $0.0000001': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a2',
        amount: _m('0.0000001')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one a3 transfer of $0.0000001': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:a3',
        amount: _m('0.0000001')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d1 transfer of $0.0000097': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('0.0000097')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when Inclusive Percent is >100%': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:default',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '2.00'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '101'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when payee does not apply': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:default',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '2'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['does not exist'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '50'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.00': function(err, txn) {
      assert.equal(_m('2.00'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get one default transfer of $2.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:default',
        amount: _m('2')
      });
      assert.equal(xfer.length, 1);
    },
    'we get one d1 transfer of $0.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('0')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when two payees to same destination': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $2.00': function(err, txn) {
      assert.equal(_m('2.00'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get two transfers of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1')
      });
      assert.equal(xfer.length, 2);
    }
  },
  'when payee is below minimum': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10',
        minimumAmount: '0.20'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.20': function(err, txn) {
      assert.equal(_m('1.20'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get a d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a d2 transfer of $0.20': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.20')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when payee is above minimum': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10',
        minimumAmount: '0.05'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.10': function(err, txn) {
      assert.equal(_m('1.10'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get a d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a d2 transfer of $0.10': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when payee is below maximum': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10',
        maximumAmount: '0.20'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.10': function(err, txn) {
      assert.equal(_m('1.10'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get a d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a d2 transfer of $0.10': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when payee is above maximum': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '20',
        maximumAmount: '0.10'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $1.10': function(err, txn) {
      assert.equal(_m('1.10'), _m(txn.amount));
    },
    'we get 2 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 2);
    },
    'we get a d1 transfer of $1.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d1',
        amount: _m('1')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a d2 transfer of $0.10': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:d2',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when payee has negative minimumAmount': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10',
        minimumAmount: '-0.01'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when payee has negative maximumAmount': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '10',
        maximumAmount: '-0.01'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when payee has conflicting limits': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:Percent',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '20',
        minimumAmount: '0.30',
        maximumAmount: '0.10'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err, txn) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when payee uses valid group prefix': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['group-1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }];
      payswarm.tools.checkPayeeGroups(payees, function(err) {
        self.callback(err, null);
      });
    },
    'we get no error': function(err) {
      assert.isNull(err || null);
    }
  },
  'when payee uses "authority" group prefix': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['authority-1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }];
      payswarm.tools.checkPayeeGroups(payees, function(err) {
        self.callback(err);
      });
    },
    'we get an error': function(err) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayeeGroup', err.toObject().type);
    }
  },
  'when payee uses "payswarm" group prefix': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['payswarm-1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }];
      payswarm.tools.checkPayeeGroups(payees, function(err) {
        self.callback(err);
      });
    },
    'we get an error': function(err) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayeeGroup', err.toObject().type);
    }
  },
  'when payee remainder is negative': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:d1',
        payeeGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        payeeRate: '1'
      }, {
        type: 'com:Payee',
        destination: 'urn:d2',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '0.51'
      }, {
        type: 'com:Payee',
        destination: 'urn:d3',
        payeeGroup: ['g3'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Inclusive',
        payeeRate: '0.51'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get an error': function(err) {
      assert.isNotNull(err);
      assert.equal('payswarm.financial.InvalidPayee', err.toObject().type);
    }
  },
  'when applying exclusive withdrawal fees': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:ext',
        payeeGroup: ['withdrawal', 'authority_gateway'],
        payeeRate: '10',
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        comment: 'Withdrawal'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority'],
        payeeApplyGroup: ['authority_gateway'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayPercentExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:Percent',
        payeeRate: '0.99',
        payeeApplyType: 'com:Exclusive',
        comment: 'Withdrawal Processing Service'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority'],
        payeeApplyGroup: ['authority_gateway'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayFlatExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.50',
        payeeApplyType: 'com:Exclusive',
        comment: 'Withdrawal Processing Service'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $10.599': function(err, txn) {
      assert.equal(_m('10.599'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get an ext transfer of $10.00': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:ext',
        amount: _m('10.00')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.099': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.099')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.50': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.50')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying inclusive withdrawal fees': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:ext',
        payeeGroup: ['withdrawal', 'authority_gateway'],
        payeeRate: '10',
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        comment: 'Withdrawal'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority'],
        payeeApplyGroup: ['authority_gateway'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayPercentExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:Percent',
        payeeRate: '0.99',
        payeeApplyType: 'com:Inclusive',
        comment: 'Withdrawal Processing Service'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority'],
        payeeApplyGroup: ['authority_gateway'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayFlatExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.50',
        payeeApplyType: 'com:Inclusive',
        comment: 'Withdrawal Processing Service'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $10.00': function(err, txn) {
      assert.equal(_m('10.00'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get an ext transfer of $9.4010005': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:ext',
        amount: _m('9.4010005')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.099': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.099')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.50': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.4999995')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying inclusive withdrawal fees in order': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:ext',
        payeeGroup: ['withdrawal', 'authority_gateway'],
        payeeRate: '10',
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        comment: 'Withdrawal'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority', 'authority_percent'],
        payeeApplyGroup: ['authority_gateway'],
        payeeApplyAfter: ['authority_flat'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayPercentExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:Percent',
        payeeRate: '0.99',
        payeeApplyType: 'com:Inclusive',
        comment: 'Withdrawal Processing Service'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority', 'authority_flat'],
        payeeApplyGroup: ['authority_gateway'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayFlatExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.50',
        payeeApplyType: 'com:Inclusive',
        comment: 'Withdrawal Processing Service'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $10.00': function(err, txn) {
      assert.equal(_m('10.00'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get an ext transfer of $9.40595': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:ext',
        amount: _m('9.40595')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.09405': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.094050')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.50': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.50')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying inclusive percentage payee with minimum amount': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:ext',
        payeeGroup: ['withdrawal', 'authority_gateway'],
        payeeRate: '10',
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        comment: 'Withdrawal'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority'],
        payeeApplyGroup: ['authority_gateway', 'authority_percent'],
        payeeApplyAfter: ['authority_flat'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayPercentExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:Percent',
        payeeRate: '0.99',
        payeeApplyType: 'com:Inclusive',
        minimumAmount: '0.10',
        comment: 'Withdrawal Processing Service'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority', 'authority_flat'],
        payeeApplyGroup: ['authority_gateway'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayFlatExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.50',
        payeeApplyType: 'com:Inclusive',
        comment: 'Withdrawal Processing Service'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $10.00': function(err, txn) {
      assert.equal(_m('10.00'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get an ext transfer of $9.40': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:ext',
        amount: _m('9.40')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.10': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.10')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.50': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.50')
      });
      assert.equal(xfer.length, 1);
    }
  },
  'when applying inclusive percentage payee with maximum amount': {
    topic: function() {
      var self = this;
      var payees = [{
        type: 'com:Payee',
        destination: 'urn:ext',
        payeeGroup: ['withdrawal', 'authority_gateway'],
        payeeRate: '10',
        payeeRateType: 'com:FlatAmount',
        payeeApplyType: 'com:Exclusive',
        comment: 'Withdrawal'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority'],
        payeeApplyGroup: ['authority_gateway', 'authority_percent'],
        payeeApplyAfter: ['authority_flat'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayPercentExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:Percent',
        payeeRate: '0.99',
        payeeApplyType: 'com:Inclusive',
        maximumAmount: '0.01',
        comment: 'Withdrawal Processing Service'
      }, {
        type: 'com:Payee',
        destination: 'urn:fees',
        payeeGroup: ['authority', 'authority_flat'],
        payeeApplyGroup: ['authority_gateway'],
        payeeExemptGroup: [
          'authority',
          'authority_gatewayFlatExempt',
          'authority_exempt'
        ],
        payeeRateType: 'com:FlatAmount',
        payeeRate: '0.50',
        payeeApplyType: 'com:Inclusive',
        comment: 'Withdrawal Processing Service'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        self.callback(err, txn);
      });
    },
    'we get no error': function(err, txn) {
      assert.isNull(err || null);
    },
    'we get a total of $10.00': function(err, txn) {
      assert.equal(_m('10.00'), _m(txn.amount));
    },
    'we get 3 transfers': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      assert.equal(xfers.length, 3);
    },
    'we get an ext transfer of $9.49': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:ext',
        amount: _m('9.49')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.01': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.01')
      });
      assert.equal(xfer.length, 1);
    },
    'we get a fee transfer of $0.50': function(err, txn) {
      var xfers = jsonld.getValues(txn, 'transfer');
      var xfer = _.where(xfers, {
        destination: 'urn:fees',
        amount: _m('0.50')
      });
      assert.equal(xfer.length, 1);
    }
  }
};
