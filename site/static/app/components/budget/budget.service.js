/*!
 * PaySwarm Budget Service.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api', 'iso8601'], function(
  angular, payswarm, iso8601) {

var deps = ['$timeout', '$rootScope', 'svcModel', 'svcIdentity'];
return {svcBudget: deps.concat(factory)};

function factory($timeout, $rootScope, svcModel, svcIdentity) {
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.budgets = [];
  service.vendors = {};
  service.state = {
    loading: false
  };

  // get all budgets for an identity
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.budgets.get({
          identity: identity.id,
          success: function(budgets) {
            svcModel.replaceArray(service.budgets, budgets);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.budgets);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    } else {
      $timeout(function() {
        callback(null, service.budgets);
      });
    }
  };

  // get a single budget
  service.getOne = function(budgetId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.budgets.getOne({
        budget: budgetId,
        success: function(budget) {
          svcModel.replaceInArray(service.budgets, budget);
          service.state.loading = false;
          callback(null, budget);
          $rootScope.$apply();
        },
        error: function(err) {
          service.state.loading = false;
          callback(err);
          $rootScope.$apply();
        }
      });
    }, options.delay || 0);
  };

  // add a new budget
  service.add = function(budget, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.add({
      identity: identity.id,
      budget: budget,
      success: function(budget) {
        service.budgets.push(budget);
        service.state.loading = false;
        callback(null, budget);
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update a budget
  service.update = function(budget, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.update({
      identity: identity.id,
      budget: budget,
      success: function() {
        // get budget
        service.getOne(budget.id, callback);
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // add a vendor to a budget
  service.addVendor = function(budgetId, vendorId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.addVendor({
      budget: budgetId,
      vendor: vendorId,
      success: function() {
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // delete a vendor from a budget
  service.delVendor = function(budgetId, vendorId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.delVendor({
      budget: budgetId,
      vendor: vendorId,
      success: function() {
        // get budget and strip out vendorId
        var budget = service.budgets.filter(function(v) {
          return v.id === budgetId;
        })[0];
        budget.vendor = budget.vendor.filter(function(v) {
          return v !== vendorId;
        });
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // gets the public vendor information for a budget
  service.getVendors = function(budgetId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    var expires = 0;
    if(budgetId in service.vendors) {
      expires = service.vendors[budgetId].expires;
    }
    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      if(!(budgetId in service.vendors)) {
        service.vendors[budgetId] = {vendors: [], expires: 0};
      }
      $timeout(function() {
        payswarm.budgets.getVendors({
          budget: budgetId,
          success: function(vendors) {
            var entry = service.vendors[budgetId];
            svcModel.replaceArray(entry.vendors, vendors);
            entry.expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, entry.vendors);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    } else {
      $timeout(function() {
        callback(null, service.vendors[budgetId].vendors);
      });
    }
  };

  // deletes a budget
  service.del = function(budgetId, callback) {
    callback = callback || angular.noop;
    service.state.loading = true;
    payswarm.budgets.del({
      budget: budgetId,
      success: function() {
        svcModel.removeFromArray(budgetId, service.budgets);
        service.state.loading = false;
        callback();
        $rootScope.$apply();
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // helper function to get the last refresh date for the given budget
  service.getLastRefresh = function(budget) {
    if(!budget) {
      return null;
    }
    var interval = budget.psaRefreshInterval.split('/');
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
    var interval = budget.psaRefreshInterval.split('/');
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
    var interval = budget.psaValidityInterval.split('/');
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
    var interval = budget.psaValidityInterval.split('/');
    if(interval.length === 1) {
      return 'never';
    } else if(iso8601.Period.isValid(interval[1])) {
      var start = +new Date(interval[0]);
      var end = start + iso8601.Period.parseToTotalSeconds(interval[1]) * 1000;
      return new Date(end);
    }
    return new Date(interval[1]);
  };

  return service;
}

});
