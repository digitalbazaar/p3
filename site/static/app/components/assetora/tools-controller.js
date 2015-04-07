/*!
 * Asset Management Tools.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

return {
  routes: [{
    path: '/i/:identity/tools',
    options: {
      templateUrl: requirejs.toUrl('p3/components/assetora/tools.html')
    }
  }]
};

});
