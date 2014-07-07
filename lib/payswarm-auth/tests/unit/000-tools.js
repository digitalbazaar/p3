/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var should = require('should');
var payswarm = {
  money: require(GLOBAL.__libdir + '/payswarm-auth/money', true),
  tools: require(GLOBAL.__libdir + '/payswarm-auth/tools', true)
};
var PaySwarmError = payswarm.tools.PaySwarmError;

describe('payswarm.tool utility tests', function() {
  describe('tools.extend()', function() {
    it('should perform in-place default extension', function(done) {
      var result = {};
      payswarm.tools.extend(result, {a: 1});
      result.should.eql({a: 1});
      done();
    });
    it('should perform in-place deep extension', function(done) {
      var result = {a: {a0: 0}, b: 2};
      payswarm.tools.extend(true, result, {a: {a1: 1}});
      result.should.eql({a: {a0: 0, a1: 1}, b: 2});
      done();
    });
    it('should perform in-place shallow extension', function(done) {
      var result = {a: {a0: 0}, b: 2};
      payswarm.tools.extend(false, result, {a: {a1: 1}});
      result.should.eql({a: {a1: 1}, b: 2});
      done();
    });
    it('should be able to return a new object', function(done) {
      var result = payswarm.tools.extend(true, {}, {a: 1});
      result.should.eql({a: 1});
      done();
    });
    it('should merge multiple objects into a new object', function(done) {
      var result = {};
      payswarm.tools.extend(true, result, {a: 1}, {b: 2});
      result.should.eql({a: 1, b: 2});
      done();
    });
  });
  describe('tools.PaySwarmError', function() {
    it('should have correct type', function(done) {
      var err = new PaySwarmError('E', 'TYPE', null, null);
      err.isType('BOGUS').should.be.false;
      err.isType('TYPE').should.be.true;
      err.hasType('BOGUS').should.be.false;
      err.hasType('TYPE').should.be.true;
      done();
    });
    it('should have correct cause', function(done) {
      var err0 = new PaySwarmError('E0', 'E0TYPE', null, null);
      var err1 = new PaySwarmError('E1', 'E1TYPE', null, err0);
      err1.isType('BOGUS').should.be.false;
      err1.isType('E1TYPE').should.be.true;
      err1.hasType('BOGUS').should.be.false;
      err1.hasType('E0TYPE').should.be.true;
      err1.hasType('E1TYPE').should.be.true;
      done();
    });
  });
});
