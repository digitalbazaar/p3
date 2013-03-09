/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var jsonld = require('jsonld');
var payswarm = {
  money: require('../money'),
  tools: require('../tools')
};
var _ = require('underscore');
var Money = payswarm.money.Money;
var should = require('should');

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

describe('payswarm.tools', function() {
  describe('createTransfers() with no payees', function() {
    var payees = [];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        done(err);
      });
      it('should result in a zero total', function(done) {
        txn.amount.should.eql(_m('0'));
        done();
      });
      it('should not contain any transfers', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        xfers.should.have.lengthOf(0);
        done();
      });
    });
  });

  describe('createTransfers() with no payeeRateType', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should generate an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() with invalid payeeRateType', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'INVALID',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should generate an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() with missing payeeGroup', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should generate an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() with missing payeeApplyType', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeRate: '1'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should generate an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() with missing payeeApplyType', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'INVALID',
      payeeRate: '1'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should generate an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() when applying $1 flat amount payee', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['a'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not generate an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.00', function(done) {
        _m(txn.amount).should.eql(_m('1.00'));
        done();
      });
      it('should result in one transfer', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $1.00', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying an exclusive 2% payee to $1',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['a'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination2',
      currency: 'USD',
      payeeGroup: ['b'],
      payeeApplyGroup: ['a'],
      payeeExemptGroup: ['b'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '2.00'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.02', function(done) {
        _m(txn.amount).should.eql(_m('1.02'));
        done();
      });
      it('should result in two transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $1', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.02', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination2',
          amount: _m('0.02')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying an inclusive 2% payee to $1',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['a'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination2',
      currency: 'USD',
      payeeGroup: ['b'],
      payeeApplyGroup: ['a'],
      payeeExemptGroup: ['b'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '2.00'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in no error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.00', function(done) {
        _m(txn.amount).should.eql(_m('1.00'));
        done();
      });
      it('should result in two transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer for $0.98', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination1',
          amount: _m('0.98')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer for $0.02', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination2',
          amount: _m('0.02')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying a flat amount to 1 of 2 payees',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['a'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination2',
      currency: 'USD',
      payeeGroup: ['b'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination3',
      currency: 'USD',
      payeeGroup: ['c'],
      payeeApplyGroup: ['a'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.50'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in no error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $2.50', function(done) {
        _m(txn.amount).should.eql(_m('2.50'));
        done();
      });
      it('should result in three transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $1.00 (destination1)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $1.00 (destination2)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination2',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.50 (destination3)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination3',
          amount: _m('0.50')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying a flat amount with an exemption',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['a'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination2',
      currency: 'USD',
      payeeGroup: ['a', 'exempt'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination3',
      currency: 'USD',
      payeeGroup: ['c'],
      payeeApplyGroup: ['a'],
      payeeExemptGroup: ['exempt'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.50'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in no error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $2.50', function(done) {
        _m(txn.amount).should.eql(_m('2.50'));
        done();
      });
      it('should result in three transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $1.00 (destination1)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $1.00 (destination2)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination2',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.50 (destination3)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination3',
          amount: _m('0.50')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying selective tax rates', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['untaxed'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination2',
      currency: 'USD',
      payeeGroup: ['taxed'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:destination3',
      currency: 'USD',
      payeeGroup: ['d3'],
      payeeApplyGroup: ['taxed'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '4.5'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in no error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $2.045', function(done) {
        _m(txn.amount).should.eql(_m('2.045'));
        done();
      });
      it('should result in three transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $1.00 (destination1)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $1.00 (destination2)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination2',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.045 (destination3)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination3',
          amount: _m('0.045')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying tax rates with no payeeApplyGroup',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['assets'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:tax1',
      currency: 'USD',
      payeeGroup: ['taxes'],
      // Loop test w/o apply group
      //payeeApplyGroup: ['assets'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '5'
    }, {
      type: 'Payee',
      destination: 'urn:tax2',
      currency: 'USD',
      payeeGroup: ['taxes'],
      // Loop test w/o apply group
      //payeeApplyGroup: ['assets'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in a dependency error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql(
          'payswarm.financial.InvalidPayeeDependency');
        done();
      });
    });
  });

  describe('createTransfers() when applying selective tax rates', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:destination1',
      currency: 'USD',
      payeeGroup: ['assets'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:fees1',
      currency: 'USD',
      payeeGroup: ['fees'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.30'
    }, {
      type: 'Payee',
      destination: 'urn:fees1',
      currency: 'USD',
      payeeGroup: ['fees'],
      payeeApplyGroup: ['assets'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '2.5'
    }, {
      type: 'Payee',
      destination: 'urn:tax1',
      currency: 'USD',
      payeeGroup: ['taxes'],
      payeeApplyGroup: ['assets'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '5'
    }, {
      type: 'Payee',
      destination: 'urn:tax2',
      currency: 'USD',
      payeeGroup: ['taxes'],
      payeeApplyGroup: ['assets'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in no error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.475', function(done) {
        _m(txn.amount).should.eql(_m('1.475'));
        done();
      });
      it('should result in 5 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(5);
        done();
      });
      it('should result in one transfer of $1.00', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:destination1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one fee of $0.30', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees1',
          amount: _m('0.30')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one fee of $0.025', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees1',
          amount: _m('0.025')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one tax of $0.05', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:tax1',
          amount: _m('0.05')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one tax of $0.10', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:tax2',
          amount: _m('0.10')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying rate to duplicate groups',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1', 'g2'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['d2'],
      payeeApplyGroup: ['g1', 'g2'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {

      it('should not result in no error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.10', function(done) {
        _m(txn.amount).should.eql(_m('1.10'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $1.00', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one fee of $0.10', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.10')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying rate to a group twice', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['d2'],
      payeeApplyGroup: ['g1', 'g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {

      it('should not result in no error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.10', function(done) {
        _m(txn.amount).should.eql(_m('1.10'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $1.00', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one fee of $0.10', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.10')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when using zero-value transfers', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:remainder',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '2'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '100'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $2.00', function(done) {
        _m(txn.amount).should.eql(_m('2.00'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in no remainder', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:remainder',
          amount: _m('0')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $2.00', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('2')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when splitting a cascading flat fee ' +
    'with no remainder', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:remainder',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '2.00'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '100'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['d2'],
      payeeApplyGroup: ['d1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '50'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $2.00', function(done) {
        _m(txn.amount).should.eql(_m('2.00'));
        done();
      });
      it('should result in 3 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in no remainder', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:remainder',
          amount: _m('0')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $1.00 (destination 1)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $1.00 (destination 2)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('1')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when splitting a flat fee with no remainder',
    function() {
      var payees = [{
        type: 'Payee',
        destination: 'urn:remainder',
        currency: 'USD',
        payeeGroup: ['g1'],
        payeeRateType: 'FlatAmount',
        payeeApplyType: 'ApplyExclusively',
        payeeRate: '2.00'
      }, {
        type: 'Payee',
        destination: 'urn:d1',
        currency: 'USD',
        payeeGroup: ['d1'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'Percentage',
        payeeApplyType: 'ApplyInclusively',
        payeeRate: '50'
      }, {
        type: 'Payee',
        destination: 'urn:d2',
        currency: 'USD',
        payeeGroup: ['d2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'Percentage',
        payeeApplyType: 'ApplyInclusively',
        payeeRate: '50'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        it('should not result in an error', function(done) {
          should.not.exist(err);
          done();
        });
        it('should result in a total of $2.00', function(done) {
          _m(txn.amount).should.eql(_m('2.00'));
          done();
        });
        it('should result in 3 transfers', function(done) {
          jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
          done();
        });
        it('should result in no remainder', function(done) {
          var xfers = jsonld.getValues(txn, 'transfer');
          var xfer = _.where(xfers, {
            destination: 'urn:remainder',
            amount: _m('0')
          });
          xfer.should.have.lengthOf(1);
          done();
        });
        it('should result in one transfer of $1.00 (destination 1)',
          function(done) {
          var xfers = jsonld.getValues(txn, 'transfer');
          var xfer = _.where(xfers, {
            destination: 'urn:d1',
            amount: _m('1')
          });
          xfer.should.have.lengthOf(1);
          done();
        });
        it('should result in one transfer of $1.00 (destination 2)',
          function(done) {
          var xfers = jsonld.getValues(txn, 'transfer');
          var xfer = _.where(xfers, {
            destination: 'urn:d2',
            amount: _m('1')
          });
          xfer.should.have.lengthOf(1);
          done();
        });
      });
    });

  describe('createTransfers() when splitting a flat fee with remainder',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:remainder',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '3.00'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '33'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['d2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '33'
    }, {
      type: 'Payee',
      destination: 'urn:d3',
      currency: 'USD',
      payeeGroup: ['d3'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '33'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $3.00', function(done) {
        _m(txn.amount).should.eql(_m('3.00'));
        done();
      });
      it('should result in 4 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(4);
        done();
      });
      it('should result in one remainder transfer of $0.03', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:remainder',
          amount: _m('0.03')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one d1 transfer of $0.99 (destination1)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.99')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one d2 transfer of $0.99 (destination1)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.99')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one d3 transfer of $0.99 (destination1)',
        function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d3',
          amount: _m('0.99')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying an evenly-divisible flat fee',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:a1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.50'
    }, {
      type: 'Payee',
      destination: 'urn:a2',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.50'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '1.00'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.00', function(done) {
        _m(txn.amount).should.eql(_m('1.00'));
        done();
      });
      it('should result in 3 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $0.00 (a1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a1',
          amount: _m('0')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.00 (a2)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a2',
          amount: _m('0')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $1.00 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  // FIXME: Explain why this is "non-evenly-divisible"
  describe('createTransfers() when applying an non-evenly-divisible flat fee',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:a1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.33'
    }, {
      type: 'Payee',
      destination: 'urn:a2',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.34'
    }, {
      type: 'Payee',
      destination: 'urn:a3',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.33'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '0.99'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.00', function(done) {
        _m(txn.amount).should.eql(_m('1.00'));
        done();
      });
      it('should result in 4 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(4);
        done();
      });
      it('should result in one transfer of $0.0033 (a1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a1',
          amount: _m('0.0033')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.0034 (a2)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a2',
          amount: _m('0.0034')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.0033 (a3)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a3',
          amount: _m('0.0033')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.99 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('0.99')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying an non-evenly-divisible flat fee',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:a1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.0000000033'
    }, {
      type: 'Payee',
      destination: 'urn:a2',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.0000000034'
    }, {
      type: 'Payee',
      destination: 'urn:a3',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '0.0000000033'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '0.0000000099'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $0.00000001', function(done) {
        _m(txn.amount).should.eql(_m('0.00000001'));
        done();
      });
      it('should result in 4 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(4);
        done();
      });
      it('should result in one transfer of $0.0000000001 (a1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a1',
          amount: _m('0.0000000001')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.0000000001 (a2)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a2',
          amount: _m('0.0000000001')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.0000000001 (a3)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:a3',
          amount: _m('0.0000000001')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.0000000097 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('0.0000000097')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when ApplyInclusively is greater than 100%',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:default',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '2.00'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '110'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in an error', function(done) {
        should.exist(err);
        done();
      });
    });
  });

  // FIXME: Should we throw an error in this case?
  describe('createTransfers() when a payee does not apply', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:default',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '2.00'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['d1'],
      payeeApplyGroup: ['does not exist'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '50'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $2.00', function(done) {
        _m(txn.amount).should.eql(_m('2.00'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $2.00 (default)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:default',
          amount: _m('2.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one one transfer of $0.00 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('0')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when two payees go to the same destination',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }, {
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1.00'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $2.00', function(done) {
        _m(txn.amount).should.eql(_m('2.00'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in two transfers of $1.00 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(2);
        done();
      });
    });
  });

  describe('createTransfers() when a payee is below the minimum',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['g2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10',
      minimumAmount: '0.20'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.20', function(done) {
        _m(txn.amount).should.eql(_m('1.20'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $1.00 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.20 (d2)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.20')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when a payee is above the minimum',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['g2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10',
      minimumAmount: '0.05'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.10', function(done) {
        _m(txn.amount).should.eql(_m('1.10'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $1.00 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.10 (d2)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.10')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when a payee is below the maximum',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['g2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10',
      maximumAmount: '0.20'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.10', function(done) {
        _m(txn.amount).should.eql(_m('1.10'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $1.00 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.10 (d2)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.10')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when a payee is above the maximum',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['g2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '20',
      maximumAmount: '0.10'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $1.10', function(done) {
        _m(txn.amount).should.eql(_m('1.10'));
        done();
      });
      it('should result in 2 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(2);
        done();
      });
      it('should result in one transfer of $1.00 (d1)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d1',
          amount: _m('1.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.10 (d2)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:d2',
          amount: _m('0.10')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when a payee has a negative minimumAmount',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['g2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '10',
      minimumAmount: '-0.01'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() when a payee has a negative maximumAmount',
      function() {
      var payees = [{
        type: 'Payee',
        destination: 'urn:d1',
        currency: 'USD',
        payeeGroup: ['g1'],
        payeeRateType: 'FlatAmount',
        payeeApplyType: 'ApplyExclusively',
        payeeRate: '1'
      }, {
        type: 'Payee',
        destination: 'urn:d2',
        currency: 'USD',
        payeeGroup: ['g2'],
        payeeApplyGroup: ['g1'],
        payeeRateType: 'Percentage',
        payeeApplyType: 'ApplyExclusively',
        payeeRate: '10',
        maximumAmount: '-0.01'
      }];
      var txn = _txn();
      payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
        it('should result in an error', function(done) {
          should.exist(err);
          err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
          done();
        });
      });
    });

  describe('createTransfers() when a payee has conflicting limits',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['g2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'Percentage',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '20',
      minimumAmount: '0.30',
      maximumAmount: '0.10'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() when a payee uses a valid group prefix',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['group-1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }];
    payswarm.tools.checkPayeeGroups(payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('createTransfers() when a payee uses "authority" group prefix',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['authority-1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }];
    payswarm.tools.checkPayeeGroups(payees, function(err) {
      it('should result in an error', function(done) {
        should.exist(err);
        done();
      });
    });
  });

  describe('createTransfers() when a payee uses "payswarm" group prefix',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['payswarm-1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }];
    payswarm.tools.checkPayeeGroups(payees, function(err) {
      it('should result in an error', function(done) {
        should.exist(err);
        done();
      });
    });
  });

  describe('createTransfers() when a payee remainder is negative', function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:d1',
      currency: 'USD',
      payeeGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      payeeRate: '1'
    }, {
      type: 'Payee',
      destination: 'urn:d2',
      currency: 'USD',
      payeeGroup: ['g2'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '0.51'
    }, {
      type: 'Payee',
      destination: 'urn:d3',
      currency: 'USD',
      payeeGroup: ['g3'],
      payeeApplyGroup: ['g1'],
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyInclusively',
      payeeRate: '0.51'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should result in an error', function(done) {
        should.exist(err);
        err.toObject().type.should.eql('payswarm.financial.InvalidPayee');
        done();
      });
    });
  });

  describe('createTransfers() when applying exclusive withdrawal fees',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:ext',
      currency: 'USD',
      payeeGroup: ['withdrawal', 'authority_gateway'],
      payeeRate: '10',
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      comment: 'Withdrawal'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority'],
      payeeApplyGroup: ['authority_gateway', 'authority_flat'],
      payeeExemptGroup: [
        'authority_gatewayPercentExempt', 'authority_exempt'],
      payeeRateType: 'Percentage',
      // ((1 / (1 - 0.0099)) - 1) * 100
      payeeRate: '0.9998990002',
      payeeApplyType: 'ApplyExclusively',
      comment: 'Withdrawal Processing Service'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority', 'authority_flat'],
      payeeApplyGroup: ['authority_gateway'],
      payeeExemptGroup: [
        'authority',
        'authority_gatewayFlatExempt',
        'authority_exempt'
      ],
      payeeRateType: 'FlatAmount',
      payeeRate: '0.50',
      payeeApplyType: 'ApplyExclusively',
      comment: 'Withdrawal Processing Service'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $10.6049893950', function(done) {
        _m(txn.amount).should.eql(_m('10.6049893950'));
        done();
      });
      it('should result in 3 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $10.00 (ext)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:ext',
          amount: _m('10.00')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.1049893950 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.1049893950')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.50 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.50')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  describe('createTransfers() when applying inclusive withdrawal fees',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:ext',
      currency: 'USD',
      payeeGroup: ['withdrawal', 'authority_gateway'],
      payeeRate: '10',
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      comment: 'Withdrawal'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority'],
      payeeApplyGroup: ['authority_gateway'],
      payeeApplyAfter: ['authority_flat'],
      payeeExemptGroup: [
        'authority',
        'authority_gatewayPercentExempt',
        'authority_exempt'
      ],
      payeeRateType: 'Percentage',
      // (1 - (1 / (1 + 0.0099))) * 100
      payeeRate: '0.9802950788',
      payeeApplyType: 'ApplyInclusively',
      comment: 'Withdrawal Processing Service'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority', 'authority_flat'],
      payeeApplyGroup: ['authority_gateway'],
      payeeExemptGroup: [
        'authority',
        'authority_gatewayFlatExempt',
        'authority_exempt'
      ],
      payeeRateType: 'FlatAmount',
      payeeRate: '0.50',
      payeeApplyType: 'ApplyInclusively',
      comment: 'Withdrawal Processing Service'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $10.00', function(done) {
        _m(txn.amount).should.eql(_m('10.00'));
        done();
      });
      it('should result in 3 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $9.4068719684 (ext)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:ext',
          amount: _m('9.4068719684')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.0931280316 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.0931280316')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.50 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.50')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  // FIXME: Why are some groups prefixed with authority_ vs. payswarm- ?
  describe('createTransfers() when using inclusive % payee with minimumAmount',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:ext',
      currency: 'USD',
      payeeGroup: ['withdrawal', 'authority_gateway'],
      payeeRate: '10',
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      comment: 'Withdrawal'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority'],
      payeeApplyGroup: ['authority_gateway', 'authority_percent'],
      payeeApplyAfter: ['authority_flat'],
      payeeExemptGroup: [
        'authority',
        'authority_gatewayPercentExempt',
        'authority_exempt'
      ],
      payeeRateType: 'Percentage',
      // (1 - (1 / (1 + 0.0099))) * 100
      payeeRate: '0.9802950788',
      payeeApplyType: 'ApplyInclusively',
      minimumAmount: '0.10',
      comment: 'Withdrawal Processing Service'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority', 'authority_flat'],
      payeeApplyGroup: ['authority_gateway'],
      payeeExemptGroup: [
        'authority',
        'authority_gatewayFlatExempt',
        'authority_exempt'
      ],
      payeeRateType: 'FlatAmount',
      payeeRate: '0.50',
      payeeApplyType: 'ApplyInclusively',
      comment: 'Withdrawal Processing Service'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $10.00', function(done) {
        _m(txn.amount).should.eql(_m('10.00'));
        done();
      });
      it('should result in 3 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $9.40 (ext)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:ext',
          amount: _m('9.40')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.10 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.10')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.50 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.50')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });

  // FIXME: Why are some groups prefixed with authority_ vs. payswarm- ?
  describe('createTransfers() when using inclusive % payee with maximumAmount',
    function() {
    var payees = [{
      type: 'Payee',
      destination: 'urn:ext',
      currency: 'USD',
      payeeGroup: ['withdrawal', 'authority_gateway'],
      payeeRate: '10',
      payeeRateType: 'FlatAmount',
      payeeApplyType: 'ApplyExclusively',
      comment: 'Withdrawal'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority'],
      payeeApplyGroup: ['authority_gateway', 'authority_percent'],
      payeeApplyAfter: ['authority_flat'],
      payeeExemptGroup: [
        'authority',
        'authority_gatewayPercentExempt',
        'authority_exempt'
      ],
      payeeRateType: 'Percentage',
      // (1 - (1 / (1 + 0.0099))) * 100
      payeeRate: '0.9802950788',
      payeeApplyType: 'ApplyInclusively',
      maximumAmount: '0.01',
      comment: 'Withdrawal Processing Service'
    }, {
      type: 'Payee',
      destination: 'urn:fees',
      currency: 'USD',
      payeeGroup: ['authority', 'authority_flat'],
      payeeApplyGroup: ['authority_gateway'],
      payeeExemptGroup: [
        'authority',
        'authority_gatewayFlatExempt',
        'authority_exempt'
      ],
      payeeRateType: 'FlatAmount',
      payeeRate: '0.50',
      payeeApplyType: 'ApplyInclusively',
      comment: 'Withdrawal Processing Service'
    }];
    var txn = _txn();
    payswarm.tools.createTransfers(txn, sourceId, payees, function(err) {
      it('should not result in an error', function(done) {
        should.not.exist(err);
        done();
      });
      it('should result in a total of $10.00', function(done) {
        _m(txn.amount).should.eql(_m('10.00'));
        done();
      });
      it('should result in 3 transfers', function(done) {
        jsonld.getValues(txn, 'transfer').should.have.lengthOf(3);
        done();
      });
      it('should result in one transfer of $9.49 (ext)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:ext',
          amount: _m('9.49')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.01 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.01')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
      it('should result in one transfer of $0.50 (fees)', function(done) {
        var xfers = jsonld.getValues(txn, 'transfer');
        var xfer = _.where(xfers, {
          destination: 'urn:fees',
          amount: _m('0.50')
        });
        xfer.should.have.lengthOf(1);
        done();
      });
    });
  });
});
