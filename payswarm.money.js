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

api.ROUND_MODE = {
  DOWN: bigdecimal.RoundingMode.DOWN(),
  UP: bigdecimal.RoundingMode.UP()
};

/**
 * A Money object is used for handling precise monetary amounts on PaySwarm.
 *
 * @param amount the amount to use.
 * @param precision the precision to use (default: 7).
 * @param roundMode the round mode to use (default: DOWN).
 */
api.Money = function(amount, precision, roundMode) {
  this.precision = (precision === undefined) ? MONEY_PRECISION : precision;
  this.roundMode = (roundMode === undefined) ? MONEY_ROUND_MODE : roundMode;

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
      this.precision, this.roundMode);
  }
};
api.Money.ROUND_MODE = api.ROUND_MODE;

// internal helper to wrap BigDecimal
function _wrapBigDecimal(bd, precision, roundMode) {
  if(!(bd instanceof bigdecimal.BigDecimal)) {
    bd = new bigdecimal.BigDecimal(amount);
  }
  var rval = new api.Money(null, precision, roundMode);
  rval.value = bd.setScale(precision, roundMode);
  return rval;
};

// prototype for Money
api.Money.prototype.abs = function() {
  return _wrapBigDecimal(this.value.abs(), this.precision, this.roundMode);
};
api.Money.prototype.add = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrapBigDecimal(x, this.precision, this.roundMode);
  }
  return _wrapBigDecimal(
    this.value.add(x.value), this.precision, this.roundMode);
};
api.Money.prototype.subtract = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrapBigDecimal(x, this.precision, this.roundMode);
  }
  return _wrapBigDecimal(this.value.subtract(x.value));
};
api.Money.prototype.multiply = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrapBigDecimal(x, this.precision, this.roundMode);
  }
  return _wrapBigDecimal(this.value.multiply(x.value));
};
api.Money.prototype.divide = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrapBigDecimal(x, this.precision, this.roundMode);
  }
  return _wrapBigDecimal(
    this.value.divide(x.value), this.precision, this.roundMode);
};
api.Money.prototype.compareTo = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrapBigDecimal(x, this.precision, this.roundMode);
  }
  return this.value.compareTo(x.value);
};
api.Money.prototype.isNegative = function() {
  return (this.value.compareTo(new bigdecimal.BigDecimal(0)) < 0);
};
api.Money.prototype.setNegative = function(negative) {
  if(this.isNegative() === negative) {
    return;
  }
  if(this.isNegative()) {
    return this.abs();
  }
  var zero = _wrapBigDecimal(bd, this.precision, this.roundMode);
  return zero.subtract(this);
};
api.Money.prototype.isZero = function() {
  return (this.value.compareTo(new bigdecimal.BigDecimal(0)) === 0);
};
api.Money.prototype.toString = function() {
  return this.value.toPlainString();
};
