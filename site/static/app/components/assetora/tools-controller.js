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
      templateUrl: '/app/components/assetora/tools.html'
    }
  }]
};

});
