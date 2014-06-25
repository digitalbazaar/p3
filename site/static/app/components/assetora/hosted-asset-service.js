/*!
 * PaySwarm Hosted Asset Service.
 *
 * @author Dave Longley
 */
define([], function() {

var deps = [
  '$http', '$rootScope','IdentityService', 'ResourceService'];
return {HostedAssetService: deps.concat(factory)};

function factory($http, $rootScope, IdentityService, ResourceService) {
  var service = {};

  var identity = IdentityService.identity;
  service.collection = new ResourceService.Collection({
    url: identity.id + '/assets'
  });
  service.state = service.collection.state;

  /**
   * Gets the hosted assets for an identity.
   *
   * Gets hosted assets before a certain creation date. Results will be
   * returned in pages. To get the next page, the last asset from
   * the previous page and its creation date must be passed. A limit
   * can be passed for the number of assets to return, otherwise,
   * the server maximum-permitted will be used.
   *
   * @param options the options to use:
   *          [identity] the identity to get the hosted assets for.
   *          [type] the asset type to get.
   *          [createdStart] the creation start date.
   *          [keywords] any keywords to do the look up by.
   *          [previous] the previous asset (for pagination).
   *          [limit] the maximum number of assets to get.
   *          [assetContent] the asset content URL for the assets to get.
   *
   * @return a Promise.
   */
  service.query = function(options) {
    var query = {};
    if(options.type) {
      query.type = options.type;
    }
    if(options.createdStart) {
      if(query.createdStart instanceof Date) {
        query.createdStart = (+options.createdStart / 1000);
      }
      else {
        query.createdStart = options.createdStart;
      }
    }
    if(options.previous) {
      query.previous = options.previous;
    }
    if(options.limit) {
      query.limit = options.limit;
    }
    if(options.keywords) {
      query.keywords = options.keywords;
    }
    if(options.assetContent) {
      query.assetContent = options.assetContent;
    }
    return service.collection.getAll({params: query});
  };

  // set an asset's public key
  service.setKey = function(assetId, publicKey) {
    service.state.loading = true;
    return Promise.resolve($http.post(assetId + '/key', publicKey))
      .then(function() {
        // FIXME: track which assets have a public key set?
        service.state.loading = false;
      }).catch(function(err) {
        service.state.loading = false;
        throw err;
      });
  };

  // expose service to scope
  $rootScope.app.services.hostedAsset = service;

  return service;
}

});
