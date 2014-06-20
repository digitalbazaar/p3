/*!
 * Site config.
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 *
 * @author David I. Lehn
 */
define([], function() {

'use strict';

return {
  site: {
    navbar: {
      private: [
        {
          slug: 'dashboard',
          icon: 'icon-dashboard',
          label: 'Dashboard',
          pageTitle: 'Dashboard'
        },
/*
        {
          slug: 'tools',
          icon: 'icon-briefcase',
          label: 'Tools',
          items: [
            {
              slug: 'assetora',
              icon: 'icon-cloud',
              label: 'Sell Digital Content',
              pageTitle: 'Sell Digital Content'
            },
            {
              slug: 'invoices',
              icon: 'icon-money',
              label: 'Invoices',
              pageTitle: 'Invoices'
            },
            {
              slug: 'causes',
              icon: 'icon-heart',
              label: 'Causes',
              pageTitle: 'Causes'
            },
            {
              slug: 'tickets',
              icon: 'icon-ticket',
              label: 'Tickets',
              pageTitle: 'Tickets'
            },
            {
              divider: true
            },
            {
              slug: 'tools',
              icon: 'icon-list',
              label: 'More',
              pageTitle: 'Tools'
            }
          ]
        },
*/
        {
          slug: 'settings',
          icon: 'icon-wrench',
          label: 'Settings',
          pageTitle: 'Settings'
        }
      ],
      public: [/*
        {
          slug: 'tools',
          icon: 'icon-cogs',
          label: 'Tools',
          pageTitle: 'Tools',
          url: '/tools'
        }*/
      ]
    }
  }
};

});
