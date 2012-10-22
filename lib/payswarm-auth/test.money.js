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
  'when default constructor': {
    topic: function() {
      return new Money();
    },
    'we get Money': function(topic) {
      assert.instanceOf(topic, Money);
    },
    'we get a zero': function(topic) {
      assert.equal(_m('0'), topic.toString());
      assert.isTrue(topic.isZero());
    }
  },
  'when testing for "Non-terminating decimal expansion"': {
    // 'java.lang.ArithmeticException:
    // Non-terminating decimal expansion;
    // no exact representable decimal result'
    topic: function() {
      return new Money('0.50').divide(new Money('9.9010000'));
    },
    'we get Money': function(topic) {
      assert.instanceOf(topic, Money);
    },
    'we get a correct result': function(topic) {
      assert.equal(_m('0.0504999'), topic.toString());
    }
  },
  'when testing isNegative': {
    topic: null,
    'we pass simple tests': function(topic) {
      assert.isTrue(new Money('-1').isNegative());
      assert.isFalse(new Money('0').isNegative());
      assert.isFalse(new Money('1').isNegative());
    }
  },
  'when testing setNegative': {
    topic: null,
    'we pass positive money tests': function(topic) {
      var m = new Money('1');
      assert.isFalse(m.isNegative());
      assert.isTrue(m.setNegative(true).isNegative());
      assert.isFalse(m.setNegative(false).isNegative());
    },
    'we pass negative money tests': function(topic) {
      var m = new Money('-1');
      assert.isTrue(m.isNegative());
      assert.isTrue(m.setNegative(true).isNegative());
      assert.isFalse(m.setNegative(false).isNegative());
    }
  }
};
