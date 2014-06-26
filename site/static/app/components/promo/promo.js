/*!
 * Promo module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './promo-service'
], function(angular, promoService) {

'use strict';

var module = angular.module('app.promo', []);

module.service(promoService);

return module.name;

});
