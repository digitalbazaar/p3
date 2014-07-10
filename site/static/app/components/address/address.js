/*!
 * Address module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './add-address-modal-directive',
  './address-selector-directive',
  './address-service',
  './address-view-directive',
  './addresses-controller',
  './addresses-directive'
], function(
  angular,
  addAddressModalDirective,
  addressSelectorModalDirective,
  addressService,
  addressViewDirective,
  addressesController,
  addressesDirective
) {

'use strict';

var module = angular.module('app.address', []);

module.directive(addAddressModalDirective);
module.directive(addressSelectorModalDirective);
module.service(addressService);
module.directive(addressViewDirective);
module.controller(addressesController);
module.directive(addressesDirective);

return module.name;

});
