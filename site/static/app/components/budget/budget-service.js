/*!
 * PaySwarm Budget Service.
 *
 * @author Dave Longley
 */
define(['iso8601'], function(iso8601) {

'use strict';

/* @ngInject */
function factory(
  $http, $rootScope, IdentityService, RefreshService,
  ResourceService, config) {
  var service = {};

  // create main budget collection
  var identity = IdentityService.identity;
  service.collection = new ResourceService.Collection({
    url: identity.id + '/budgets'
  });
  service.state = service.collection.state;
  service.budgets = service.collection.storage;
  service.vendors = {};

  // add a vendor to a budget
  service.addVendor = function(budgetId, vendorId) {
    service.state.loading = true;
    return Promise.resolve($http.post(budgetId, {
      '@context': config.data.contextUrl,
      vendor: vendorId
    })).then(function() {
      // get budget
      return service.collection.get(budgetId);
    }).catch(function(err) {
      service.state.loading = false;
      $rootScope.$apply();
      throw err;
    });
  };

  // delete a vendor from a budget
  service.delVendor = function(budgetId, vendorId) {
    service.state.loading = true;
    return Promise.resolve($http.delete(budgetId, {
      vendor: vendorId
    })).then(function() {
      // get budget
      return service.collection.get(budgetId);
    }).catch(function(err) {
      service.state.loading = false;
      $rootScope.$apply();
      throw err;
    });
  };

  // gets the public vendor information for a budget
  service.getVendors = function(budgetId, options) {
    var collection;
    if(!(budgetId in service.vendors)) {
      collection = service.vendors[budgetId] = new ResourceService.Collection({
        url: budgetId + '?view=vendors'
      });
    } else {
      collection = service.vendors[budgetId];
    }
    service.state.loading = true;
    return collection.getAll(options).then(function() {
      service.state.loading = false;
    }).catch(function(err) {
      service.state.loading = false;
      throw err;
    });
  };

  // helper function to get the last refresh date for the given budget
  service.getLastRefresh = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.sysRefreshInterval.split('/');
    if(interval.length === 3) {
      return new Date(interval[1]);
    }
    return new Date(interval[0]);
  };

  // helper function to get the refresh duration for the given budget
  service.getRefreshDuration = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.sysRefreshInterval.split('/');
    if(interval.length === 3) {
      return interval[2];
    }
    return 'never';
  };

  // helper function to get the valid duration for the given budget
  service.getValidDuration = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.sysValidityInterval.split('/');
    if(interval.length === 1) {
      return 'never';
    }
    return interval[1];
  };

  // helper function to get expiration date for the given budget
  service.getExpiration = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.sysValidityInterval.split('/');
    if(interval.length === 1) {
      return 'never';
    } else if(iso8601.Period.isValid(interval[1])) {
      var start = +new Date(interval[0]);
      var end = start + iso8601.Period.parseToTotalSeconds(interval[1]) * 1000;
      return new Date(end);
    }
    return new Date(interval[1]);
  };

  // register for system-wide refreshes
  RefreshService.register(service.collection);

  // expose service to scope
  $rootScope.app.services.budget = service;

  return service;
}

return {BudgetService: factory};

});
