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
  }
};
