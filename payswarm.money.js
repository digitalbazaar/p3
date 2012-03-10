/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var bigdecimal = require('bigdecimal');
var payswarm = {
  logger: require('./payswarm.logger')
};

var api = {};
module.exports = api;

// money 7-digit (after decimal) precision, round down
var MONEY_PRECISION = 7;
var MONEY_ROUND_MODE = bigdecimal.RoundingMode.DOWN();

/**
 * A Money object is used for handling precise monetary amounts on PaySwarm.
 */
api.Money = function(amount) {
  if(typeof(amount) === undefined) {
    amount = 0;
  }
  if(amount === null) {
    this.value = null;
  }
  else if(amount instanceof api.Money) {
    this.value = amount.value;
  }
  else {
    this.value = new bigdecimal.BigDecimal(amount).setScale(
      MONEY_PRECISION, MONEY_ROUND_MODE);
  }
};

// internal helper to wrap BigDecimal
function _wrapBigDecimal(bd) {
  var rval = new api.Money(null);
  rval.value = bd.setScale(MONEY_PRECISION, MONEY_ROUND_MODE);
  return rval;
};

// prototype for Money
api.Money.prototype.abs = function() {
  return _wrapBigDecimal(this.value.abs());
};
api.Money.prototype.add = function(x) {
  if(!(x instanceof api.Money)) {
    x = new api.Money(x);
  }
  return _wrapBigDecimal(this.value.add(x.value));
};
api.Money.prototype.subtract = function(x) {
  if(!(x instanceof api.Money)) {
    x = new api.Money(x);
  }
  return _wrapBigDecimal(this.value.subtract(x.value));
};
api.Money.prototype.multiply = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrapBigDecimal(x);
  }
  return _wrapBigDecimal(this.value.multiply(x.value));
};
api.Money.prototype.divide = function(x) {
  if(!(x instanceof api.Money)) {
    x = new api.Money(x);
  }
  return _wrapBigDecimal(this.value.divide(x.value));
};
api.Money.prototype.compareTo = function(x) {
  if(!(x instanceof api.Money)) {
    x = new api.Money(x);
  }
  return this.value.compareTo(x.value);
};
api.Money.prototype.isNegative = function() {
  return (this.value.compareTo(new bigdecimal.BigDecimal(0)) < 0);
};
api.Money.prototype.toString = function() {
  return this.value.toPlainString();
};
