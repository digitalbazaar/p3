/*!
 * PaySwarm Hosted Listing Service.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = ['$timeout', '$rootScope', 'svcModel', 'svcIdentity'];
return {svcHostedListing: deps.concat(factory)};

function factory($timeout, $rootScope, svcModel, svcIdentity) {
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.recentListings = [];
  service.state = {
    loading: false
  };

  /**
   * Gets the hosted listings for an identity.
   *
   * @param options the options to use:
   *          [identity] the identity to get the hosted listings for.
   *          [storage] an array to update w/the listings.
   *          [delay] a timeout to wait before fetching listings.
   *          [createdStart] the creation start date.
   *          [keywords] any keywords to do the look up by.
   *          [asset] the asset to get the listings for.
   *          [previous] the previous listing (for pagination).
   *          [limit] the maximum number of listings to get.
   *          [includeAsset] true if the asset information should be embedded
   *            in any results, false if not (default: true).
   */
  service.get = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.hosted.listings.get({
        identity: options.identity || identity.id,
        createdStart: options.createdStart || undefined,
        keywords: options.keywords || undefined,
        asset: options.asset || undefined,
        previous: options.previous || undefined,
        limit: options.limit || undefined,
        includeAsset: ('includeAsset' in options) ?
          options.includeAsset : undefined,
        success: function(listings) {
          if(options.storage) {
            svcModel.replaceArray(options.storage, listings);
          }
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, options.storage || listings);
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

  // get all recent hosted listings for an identity
  service.getRecent = function(options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    if(options.force || +new Date() >= expires) {
      service.state.loading = true;
      $timeout(function() {
        payswarm.hosted.listings.get({
          // FIXME: make date ordering explicit
          identity: identity.id,
          limit: 10,
          includeAsset: options.includeAsset || undefined,
          success: function(listings) {
            svcModel.replaceArray(service.recentListings, listings);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.recentListings);
            $rootScope.$apply();
          },
          error: function(err) {
            service.state.loading = false;
            callback(err);
            $rootScope.$apply();
          }
        });
      }, options.delay || 0);
    }
    else {
      $timeout(function() {
        callback(null, service.recentListings);
      });
    }
  };

  // get a single listing
  service.getOne = function(listingId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.hosted.listings.getOne({
        listing: listingId,
        success: function(listing) {
          if(options.storage) {
            svcModel.replaceInArray(options.storage, listing);
          }
          service.state.loading = false;
          callback(null, listing);
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

  // add a new listing
  service.add = function(listing, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    payswarm.hosted.listings.add({
      identity: identity.id,
      listing: listing,
      success: function(listing) {
        if(options.storage) {
          options.storage.push(listing);
        }
        service.getRecent({force: true}, function() {
          callback(null, listing);
          $rootScope.$apply();
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // update a listing
  service.update = function(listing, callback) {
    service.state.loading = true;
    payswarm.hosted.listings.update({
      identity: identity.id,
      listing: listing,
      success: function() {
        service.getRecent({force: true}, function() {
          // get listing
          service.getOne(listing.id, callback);
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  return service;
}

});
