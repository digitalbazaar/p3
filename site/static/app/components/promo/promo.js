/*!
 * Promo module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './promo-code-checker-directive',
  './promo-service',
  './redeem-promo-code-modal-directive'
], function(
  angular,
  promoCodeCheckerDirective,
  promoService,
  redeemPromoCodeModalDirective
) {

'use strict';

var module = angular.module('app.promo', []);

module.directive(promoCodeCheckerDirective);
module.service(promoService);
module.directive(redeemPromoCodeModalDirective);

return module.name;

});
