/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var payswarm = {
  money: require('../money'),
  tools: require('../tools')
};
var should = require('should');
var Money = payswarm.money.Money;

// convert money string into a normalized string for use in assert calls
function _m(ms) {
  return new Money(ms).toString();
}

describe('payswarm.money', function() {
  describe('Money() constructor', function() {
    var moneyValue = new Money();
    it('should be an instance of Money', function(done) {
      moneyValue.should.be.an.instanceof(Money);
      done();
    });
    it('should be zero', function(done) {
      moneyValue.toString().should.equal(_m('0'));
      moneyValue.isZero().should.be.true;
      done();
    });
  });

  describe('Non-terminating decimal expansion calculations like $0.50 / $9.901', function() {
    var moneyValue = new Money('0.50').divide(new Money('9.9010000000'));
    it('should return a Money instance', function(done) {
      moneyValue.should.be.an.instanceof(Money);
      done();
    });
    it('should return the correct result', function(done) {
      moneyValue.toString().should.equal(_m('0.0504999495'));
      done();
    });
  });

  describe('isNegative()', function() {
    it('should return the correct result for -1, 0, and 1', function(done) {
      (new Money('-1').isNegative()).should.be.true;
      (new Money('0').isNegative()).should.be.false;
      (new Money('1').isNegative()).should.be.false;
      done();
    });
  });

  describe('setNegative()', function() {
    it('should work for positive money tests', function(done) {
      var m = new Money('1');
      m.isNegative().should.be.false;
      m.setNegative(true).isNegative().should.be.true;
      m.setNegative(false).isNegative().should.be.false;
      done();
    });
    it('should work for negative money tests', function(done) {
      var m = new Money('-1');
      m.isNegative().should.be.true;
      m.setNegative(true).isNegative().should.be.true;
      m.setNegative(false).isNegative().should.be.false;
      done();
    });
  });

});
