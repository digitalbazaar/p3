/*!
 * Promo module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './promo-code-checker',
  './promo-service',
  './redeem-promo-code-modal-directive'
], function(
  angular,
  promoCodeChcker,
  promoService,
  redeemPromoCodeModalDirective
) {

'use strict';

var module = angular.module('app.promo', []);

module.controller(promoCodeChcker);
module.service(promoService);
module.directive(redeemPromoCodeModalDirective);

return module.name;

});
