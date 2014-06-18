/*!
 * PaymentToken module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './paymentToken.service'
], function(angular, paymentTokenService) {

'use strict';

var module = angular.module('app.paymentToken', []);

module.service(paymentTokenService);

});
