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
  './addresses-controller',
  './addresses-directive',
  './vcard-address-directive',
], function(
  angular,
  addAddressModalDirective,
  addressSelectorModalDirective,
  addressService,
  addressesController,
  addressesDirective,
  vcardAddressDirective
) {

'use strict';

var module = angular.module('app.address', []);

module.directive(addAddressModalDirective);
module.directive(addressSelectorModalDirective);
module.service(addressService);
module.controller(addressesController);
module.directive(addressesDirective);
module.directive(vcardAddressDirective);

});
