/*!
 * Settings config.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author David I. Lehn
 */
define([], function() {

'use strict';

return {
  settings: {
    panes: [
      {
        templateUrl: requirejs.toUrl(
          'p3/components/identity/identity-settings.html')
      },
      {
        templateUrl: requirejs.toUrl(
          'p3/components/key/key-settings.html')
      },
      {
        templateUrl: requirejs.toUrl(
          'p3/components/address/address-settings.html')
      },
      {
        templateUrl: requirejs.toUrl(
          'p3/components/payment-token/external-account-settings.html')
      }
    ]
  }
};

});
