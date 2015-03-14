/*!
 * PaySwarm Budget Service.
 *
 * @author Dave Longley
 */
define(['moment-interval'], function(moment) {

'use strict';

/* @ngInject */
function factory(
  $http, $rootScope, brIdentityService, brRefreshService,
  brResourceService, config) {
  var service = {};

  // create main budget collection
  var identity = brIdentityService.identity;
  service.collection = new brResourceService.Collection({
    url: identity.id + '/budgets'
  });
  service.state = service.collection.state;
  service.budgets = service.collection.storage;
  // map from budgetId to vendor info
  service.vendors = {};

  // add a vendor to a budget
  service.addVendor = function(budgetId, vendorId) {
    service.state.loading = true;
    return Promise.resolve($http.post(budgetId, {
      '@context': config.data.contextUrls.payswarm,
      id: budgetId,
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
      params: {
        vendor: vendorId
      }
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
      collection = service.vendors[budgetId] =
        new brResourceService.Collection({
          url: budgetId + '?view=vendors'
        });
      // FIXME: want to remove this registration when not needed
      brRefreshService.register(collection);
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
    var intervalParts = budget.sysRefreshInterval.split('/');
    var interval;
    if(intervalParts.length === 3) {
      interval = moment.interval(interval.slice(1).join('/'));
    } else {
      interval = moment.interval(budget.sysRefreshInterval);
    }
    return interval.start().toDate();
  };

  // helper function to get the refresh duration for the given budget
  service.getRefreshDuration = function(budget) {
    if(!budget) {
      return null;
    }
    var intervalParts = budget.sysRefreshInterval.split('/');
    if(intervalParts.length === 3) {
      return moment.interval(interval.slice(1).join('/')).period()
        .toISOString();
    }
    return 'never';
  };

  // helper function to get the valid duration for the given budget
  service.getValidDuration = function(budget) {
    if(!budget) {
      return null;
    }
    var intervalParts = budget.sysValidityInterval.split('/');
    if(intervalparts.length === 1) {
      return 'never';
    }
    return moment.interval(budget.sysValidityInterval).period().toISOString();
  };

  // helper function to get expiration date for the given budget
  service.getExpiration = function(budget) {
    if(!budget) {
      return null;
    }
    var intervalParts = budget.sysValidityInterval.split('/');
    var interval = moment.interval(budget.sysValidityInterval);
    if(intervalParts.length === 1) {
      return 'never';
    }
    return interval.end().toDate();
  };

  // register for system-wide refreshes
  brRefreshService.register(service.collection);

  // expose service to scope
  $rootScope.app.services.budget = service;

  return service;
}

return {psBudgetService: factory};

});
