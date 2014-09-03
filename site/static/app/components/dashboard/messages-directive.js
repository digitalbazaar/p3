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

/* @ngInject */
function factory(brIdentityService) {
  return {
    restrict: 'A',
    templateUrl: '/app/components/dashboard/messages-view.html',
    link: Link
  };

  function Link(scope) {
    var model = scope.model = {};
    model.state = {
      identity: brIdentityService.state
    };
    model.messages = [];
  }
}

return {psMessages: factory};

});
