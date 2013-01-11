/*
 * Copyright (c) 2012 Digital Bazaar, Inc. All rights reserved.
 */
var BigNumber = require('bignumber.js');

var api = {};
module.exports = api;

api.ROUND_MODE = {
  DOWN: BigNumber.ROUND_DOWN, // towards zero
  UP: BigNumber.ROUND_UP, // away from zero
};

// money 7-digit (after decimal) precision, round down
var MONEY_PRECISION = 7;
var MONEY_ROUND_MODE = api.ROUND_MODE.DOWN;
BigNumber.config({
  DECIMAL_PLACES: MONEY_PRECISION,
  ROUNDING_MODE: MONEY_ROUND_MODE
});

// shared zero
var _bnZero;

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

  if(amount === undefined) {
    amount = 0;
  }
  if(amount instanceof api.Money) {
    this.value = new BigNumber(amount.value);
  }
  else {
    this.value = new BigNumber(amount);
  }
  this.value = this.value.round(this.precision, this.roundMode);
};
api.Money.ROUND_MODE = api.ROUND_MODE;

// standard factory function for precise money for payswarm use
api.createMoney = function(amount) {
  return new api.Money(amount);
};

// standard factory function for money external to payswarm use
// (eg: for charging credit cards, bank accounts, etc)
api.createExternalMoney = function(amount) {
  /* Note: When dealing with money external to the system, round to
  2 decimal places, always rounding down. */
  return new api.Money(amount, 2, api.Money.ROUND_MODE.DOWN);
};

// prototype for Money
api.Money.prototype.abs = function() {
  return _wrap(this.value.abs(), this.precision, this.roundMode);
};
api.Money.prototype.add = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrap(x, this.precision, this.roundMode);
  }
  return _wrap(this.value.plus(x.value), this.precision, this.roundMode);
};
api.Money.prototype.subtract = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrap(x, this.precision, this.roundMode);
  }
  return _wrap(this.value.minus(x.value), this.precision, this.roundMode);
};
api.Money.prototype.multiply = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrap(x, this.precision, this.roundMode);
  }
  return _wrap(this.value.times(x.value), this.precision, this.roundMode);
};
api.Money.prototype.divide = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrap(x, this.precision, this.roundMode);
  }
  return _wrap(this.value.dividedBy(x.value), this.precision, this.roundMode);
};
api.Money.prototype.compareTo = function(x) {
  if(!(x instanceof api.Money)) {
    x = _wrap(x, this.precision, this.roundMode);
  }
  return this.value.cmp(x.value);
};
api.Money.prototype.isNegative = function() {
  return (this.value.cmp(_bnZero) < 0);
};
api.Money.prototype.setNegative = function(negative) {
  if(this.isNegative() === negative) {
    return _wrap(this.value, this.precision, this.roundMode);
  }
  return _wrap(this.value.neg(), this.precision, this.roundMode);
};
api.Money.prototype.isZero = function() {
  return (this.value.cmp(_bnZero) === 0);
};
api.Money.prototype.toString = function() {
  return this.value.toFixed(this.precision);
};

// init shared zero
_bnZero = new BigNumber(0);

// internal helper to wrap BigNumber
function _wrap(bn, precision, roundMode) {
  if(!(bn instanceof BigNumber)) {
    bn = new BigNumber(bn);
  }
  return new api.Money(bn, precision, roundMode);
}
