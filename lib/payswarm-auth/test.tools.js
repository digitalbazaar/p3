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

module.exports = {
  'when calling extend': {
    topic: {},
    'in-place default': function(topic) {
      var result = {};
      payswarm.tools.extend(result, {a: 1});
      assert.deepEqual(result, {a: 1});
    },
    'in-place deep': function(topic) {
      var result = {a: {a0: 0}, b: 2};
      payswarm.tools.extend(true, result, {a: {a1: 1}});
      assert.deepEqual(result, {a: {a0: 0, a1: 1}, b: 2});
    },
    'in-place shallow': function(topic) {
      var result = {a: {a0: 0}, b: 2};
      payswarm.tools.extend(false, result, {a: {a1: 1}});
      assert.deepEqual(result, {a: {a1: 1}, b: 2});
    },
    'with return': function(topic) {
      var result = payswarm.tools.extend(true, {}, {a: 1});
      assert.deepEqual(result, {a: 1});
    },
    'multi objects': function(topic) {
      var result = {};
      payswarm.tools.extend(true, result, {a: 1}, {b: 2});
      assert.deepEqual(result, {a: 1, b: 2});
    },
  }
};
