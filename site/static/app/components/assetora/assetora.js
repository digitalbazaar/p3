/*!
 * Assetora module.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  //'./assetora-controller'
], function(angular, assetora) {

'use strict';

var module = angular.module('app.assetora', []);

module.controller(assetora);

});
