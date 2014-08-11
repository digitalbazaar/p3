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
          icon: 'fa fa-dashboard',
          label: 'Dashboard',
          pageTitle: 'Dashboard'
        },
/*
        {
          slug: 'tools',
          icon: 'fa fa-briefcase',
          label: 'Tools',
          items: [
            {
              slug: 'assetora',
              icon: 'fa fa-cloud',
              label: 'Sell Digital Content',
              pageTitle: 'Sell Digital Content'
            },
            {
              slug: 'invoices',
              icon: 'fa fa-money',
              label: 'Invoices',
              pageTitle: 'Invoices'
            },
            {
              slug: 'causes',
              icon: 'fa fa-heart',
              label: 'Causes',
              pageTitle: 'Causes'
            },
            {
              slug: 'tickets',
              icon: 'fa fa-ticket',
              label: 'Tickets',
              pageTitle: 'Tickets'
            },
            {
              divider: true
            },
            {
              slug: 'tools',
              icon: 'fa fa-list',
              label: 'More',
              pageTitle: 'Tools'
            }
          ]
        },
*/
        {
          slug: 'settings',
          icon: 'fa fa-wrench',
          label: 'Settings',
          pageTitle: 'Settings'
        }
      ],
      public: [/*
        {
          slug: 'tools',
          icon: 'fa fa-cogs',
          label: 'Tools',
          pageTitle: 'Tools',
          url: '/tools'
        }*/
      ]
    }
  }
};

});
