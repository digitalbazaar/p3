/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('underscore');
var jsonld = require('jsonld');
var payswarm = {
  money: require('../money'),
  tools: require('../tools')
};
var should = require('should');

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
});
