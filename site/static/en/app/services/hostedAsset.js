/*!
 * PaySwarm Hosted Asset Service.
 *
 * @author Dave Longley
 */
define(['angular', 'payswarm.api'], function(angular, payswarm) {

var deps = [
  '$timeout', '$rootScope', 'svcModel', 'svcIdentity', 'svcHostedListing'];
return {svcHostedAsset: deps.concat(factory)};

function factory(
  $timeout, $rootScope, svcModel, svcIdentity, svcHostedListing) {
  var service = {};

  var identity = svcIdentity.identity;
  var expires = 0;
  var maxAge = 1000*60*2;
  service.recentAssets = [];
  service.state = {
    loading: false
  };

  /**
   * Gets the hosted assets for an identity.
   *
   * @param options the options to use:
   *          [identity] the identity to get the hosted assets for.
   *          [storage] an array to update w/the assets.
   *          [delay] a timeout to wait before fetching assets.
   *          [createdStart] the creation start date.
   *          [keywords] any keywords to do the look up by.
   *          [previous] the previous asset (for pagination).
   *          [limit] the maximum number of assets to get.
   *          [assetContent] the asset content URL for the assets to get.
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
      payswarm.hosted.assets.get({
        identity: options.identity || identity.id,
        createdStart: options.createdStart || undefined,
        keywords: options.keywords || undefined,
        previous: options.previous || undefined,
        limit: options.limit || undefined,
        assetContent: options.assetContent || undefined,
        success: function(assets) {
          if(options.storage) {
            svcModel.replaceArray(options.storage, assets);
          }
          expires = +new Date() + maxAge;
          service.state.loading = false;
          callback(null, options.storage || assets);
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

  // get all recent hosted assets for an identity
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
        payswarm.hosted.assets.get({
          // FIXME: make date ordering explicit
          identity: identity.id,
          limit: 10,
          success: function(assets) {
            svcModel.replaceArray(service.recentAssets, assets);
            expires = +new Date() + maxAge;
            service.state.loading = false;
            callback(null, service.recentAssets);
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
        callback(null, service.recentAssets);
      });
    }
  };

  // get a single asset
  service.getOne = function(assetId, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    $timeout(function() {
      payswarm.hosted.assets.getOne({
        asset: assetId,
        success: function(asset) {
          if(options.storage) {
            svcModel.replaceInArray(options.storage, asset);
          }
          service.state.loading = false;
          callback(null, asset);
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

  // add a new asset
  service.add = function(asset, options, callback) {
    if(typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};
    callback = callback || angular.noop;

    service.state.loading = true;
    payswarm.hosted.assets.add({
      identity: identity.id,
      asset: asset,
      success: function(asset) {
        if(options.storage) {
          options.storage.push(asset);
        }
        service.getRecent({force: true}, function() {
          callback(null, asset);
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

  // update an asset
  service.update = function(asset, callback) {
    service.state.loading = true;
    payswarm.hosted.assets.update({
      identity: identity.id,
      asset: asset,
      success: function() {
        service.getRecent({force: true}, function() {
          svcHostedListing.getRecent({force: true}, function() {
            // get asset
            service.getOne(asset.id, callback);
          });
        });
      },
      error: function(err) {
        service.state.loading = false;
        callback(err);
        $rootScope.$apply();
      }
    });
  };

  // set an asset's public key
  service.setKey = function(assetId, publicKey, callback) {
    service.state.loading = true;
    payswarm.hosted.assets.setKey({
      assetId: assetId,
      publicKey: publicKey,
      success: function() {
        // FIXME: track which assets have a public key set?
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

  return service;
}

});
