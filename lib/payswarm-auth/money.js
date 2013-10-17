/*
 * Copyright (c) 2012-2013 Digital Bazaar, Inc. All rights reserved.
 */
var BigNumber = require('bignumber.js');

var api = {};
module.exports = api;

api.ROUND_MODE = {
  DOWN: BigNumber.ROUND_DOWN, // towards zero
  UP: BigNumber.ROUND_UP // away from zero
};

// money 10-digit (after decimal) precision, round down
var MONEY_PRECISION = 10;
var MONEY_ROUND_MODE = api.ROUND_MODE.DOWN;
BigNumber.config({
  DECIMAL_PLACES: MONEY_PRECISION,
  ROUNDING_MODE: MONEY_ROUND_MODE
});

/**
 * A Money object is used for handling precise monetary amounts on PaySwarm.
 *
 * @param amount the amount to use.
 * @param precision the precision to use (default: MONEY_PRECISION).
 * @param roundMode the round mode to use (default: DOWN).
 */
api.Money = function(amount, precision, roundMode) {
  this.precision = (precision === undefined) ? MONEY_PRECISION : precision;
  this.roundMode = (roundMode === undefined) ? MONEY_ROUND_MODE : roundMode;

  if(amount === undefined) {
    amount = 0;
  }
  if(amount instanceof api.Money) {
    amount = new BigNumber(amount.value);
  }
  else if(!(amount instanceof BigNumber)) {
    amount = new BigNumber(amount);
  }
  this.value = amount.round(this.precision, this.roundMode);
};
api.Money.ROUND_MODE = api.ROUND_MODE;

// standard factory function for precise money for payswarm use
api.createMoney = function(amount) {
  return new api.Money(amount);
};

// standard factory function for pulling money from an external system
// into payswarm (eg: for charging credit cards, bank accounts, etc)
api.createIncomingExternalMoney = function(amount) {
  /* Note: When dealing with money coming into the system, ensure enough
    is pulled from the external system to cover appropriate fees by always
    rounding up. Use 2 decimal places. */
  return new api.Money(amount, 2, api.Money.ROUND_MODE.UP);
};
// standard factory function for sending money to an external system
// from payswarm (eg: for crediting credit cards, bank accounts, etc)
api.createOutgoingExternalMoney = function(amount) {
  /* Note: When dealing with money leaving the system, ensure we don't
   send more than is necessary so that appropriate fees can be covered
   by always arounding down. Use 2 decimal places. */
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
  // in bignumber.js, zero can be negative so always check against zero too
  return this.value.isNegative() && !this.value.isZero();
};
api.Money.prototype.setNegative = function(negative) {
  if(this.isNegative() === negative) {
    return _wrap(this.value, this.precision, this.roundMode);
  }
  return _wrap(this.value.neg(), this.precision, this.roundMode);
};
api.Money.prototype.negate = function() {
  return _wrap(this.value.neg(), this.precision, this.roundMode);
};
api.Money.prototype.isZero = function() {
  return this.value.isZero();
};
api.Money.prototype.toString = function() {
  return this.value.toFixed(this.precision);
};
api.Money.prototype.toJSON = function() {
  return this.toString();
};
api.Money.ZERO = new api.Money(0);

// internal helper to wrap BigNumber
function _wrap(bn, precision, roundMode) {
  return new api.Money(bn, precision, roundMode);
}
