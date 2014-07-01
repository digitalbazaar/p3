/*!
 * Messages directive.
 *
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

'use strict';

var deps = ['IdentityService'];
return {budgets: deps.concat(factory)};

function factory(IdentityService) {
  function Ctrl($scope) {
    var model = $scope.model = {};
    model.state = {
      identity: IdentityService.state
    };
    model.messages = [];
  }

  return {
    controller: ['$scope', Ctrl],
    templateUrl: '/app/components/dashboard/messages-view.html'
  };
}

});
