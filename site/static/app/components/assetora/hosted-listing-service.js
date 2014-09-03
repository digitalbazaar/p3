/*!
 * PaySwarm Hosted Listing Service.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($rootScope, brIdentityService, brResourceService) {
  var service = {};

  var identity = brIdentityService.identity;
  service.collection = new brResourceService.Collection({
    url: identity.id + '/listings'
  });
  service.state = service.collection.state;

  /**
   * Gets the hosted listings for an identity.
   *
   * Gets hosted listings before a certain creation date. Results will be
   * returned in pages. To get the next page, the last listing from
   * the previous page and its creation date must be passed. A limit
   * can be passed for the number of listings to return, otherwise,
   * the server maximum-permitted will be used.
   *
   * @param options the options to use:
   *          [identity] the identity to get the hosted listings for.
   *          [createdStart] the creation start date.
   *          [keywords] any keywords to do the look up by.
   *          [asset] the asset to get the listings for.
   *          [previous] the previous listing (for pagination).
   *          [limit] the maximum number of listings to get.
   *          [includeAsset] true if the asset information should be embedded
   *            in any results, false if not (default: true).
   *
   * @return a Promise.
   */
  service.query = function(options) {
    // TODO: eliminate this call and just use .getAll()?
    var query = {};
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
    if(options.asset) {
      query.asset = options.asset;
    }
    if('includeAsset' in options && options.includeAsset !== undefined) {
      query.includeAsset = options.includeAsset;
    }
    else {
      query.includeAsset = true;
    }
    return service.collection.getAll({params: query});
  };

  // expose service to scope
  $rootScope.app.services.hostedListing = service;

  return service;
}

return {psHostedListingService: factory};

});
