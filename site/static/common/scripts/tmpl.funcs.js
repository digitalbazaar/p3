/**
 * Functions for manipulating web forms.
 * 
 * @author David I. Lehn <dlehn@digitalbazaar.com>
 * @author Dave Longley
 * @author Mike Johnson
 *
 * Copyright (c) 2011 Digital Bazaar, Inc. All rights reserved.
 */
(function($) {

// template namespace
var tmpl = window.tmpl = window.tmpl || {};

// months for date handling
tmpl.months = [
  'January','February','March','April',
  'May','June','July','August',
  'September','October','November','December'];
tmpl.monthNumbers = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

// next ten 10 years for expiration dates (quick hack)
tmpl.years = [];
var year = new Date().getFullYear();
for(var i = 0; i < 10; ++i) {
  tmpl.years.push(year + i);
}

/**
 * Capitalizes the given str.
 * 
 * @param str the string to capitalize.
 *  
 * @return the capitalized string.
 */
tmpl.capitalize = function(str) {
  var output = [];
  var tokens = str.split(' ');
  for(var i in tokens) {
    var token = tokens[i];
    if(token.length > 0) {
      output.push(token[0].toUpperCase() + token.substr(1).toLowerCase());
    }
  }
  return output.join(' ');
};

/**
 * Displays a decimal amount.
 * 
 * @param str the string input.
 * @param round 'up' to round up, 'down' to round down, default: 'up'.
 * @param digits the number of digits to use, default: '2'.
 *  
 * @return the decimal as a string.
 */
tmpl.decimal = function(str, round, digits) {
  digits = digits || 2;
  var num = parseFloat(str);
  var k = Math.pow(10, digits);
  var f = (round === 'down') ? Math.floor : Math.round;
  return '' + (f(num * k) / k).toFixed(digits);
};

/**
 * Formats a date in the client's timezone.
 * 
 * @param str the UTC date as a string or in seconds.
 * @param time true to include the time.
 * 
 * @return the formatted date.
 */
tmpl.formatDate = function(str, time) {
  var rval = '';
  
  // assume seconds
  if(str.constructor === Number) {
    str = str * 1000;
  }
  var date = new Date(str);
  rval = tmpl.months[date.getMonth()] + ' ' +
    date.getDate() + ', ' + date.getFullYear();
  if(time) {
     var minute = date.getMinutes();
     if(minute < 10) {
       minute = '0' + minute;
     }
     var hour = date.getHours();
     var pm = 'am';
     if(hour > 12) {
       hour -= 12;
       pm = 'pm';
     }
     if(hour === 0) {
       hour = 12;
     }
     rval += ' ' + hour + ':' + minute + pm;
  }
  return rval;
};

/**
 * Converts the given input into an array, if it isn't one already.
 * 
 * @param input the input.
 * 
 * @return the arrayified input.
 */
tmpl.arrayify = function(input) {
  if(!input || input.constructor !== Array) {
    input = [input];
  }
  return input;
};

/**
 * Calculates a percentage.
 * 
 * @param divisor the divisor.
 * @param dividend the dividend.
 * 
 * @return the rounded percentage result.
 */
tmpl.percentage = function(divisor, dividend) {
  return Math.round(parseFloat(divisor) / parseFloat(dividend) * 100) + '%';
};

/**
 * Determines the class to use for a progress meter based on its percentage
 * in order to colorize it.
 * 
 * @param divisor the divisor.
 * @param dividend the dividend.
 * 
 * @return the class to use.
 */
tmpl.progessMeterClass = function(divisor, dividend) {
  var rval;
  var p = Math.round(parseFloat(divisor) / parseFloat(dividend) * 100);
  if(p < 33) {
    rval = 'progress-danger';
  }
  else if(p < 66) {
    rval = 'progress-info';
  }
  else {
    rval = 'progress-success';
  }
  return rval;
};

})(jQuery);
