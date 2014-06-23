/*!
 * Address module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './address-service'
], function(angular, addressService) {

'use strict';

var module = angular.module('app.address', []);

module.service(addressService);

});
