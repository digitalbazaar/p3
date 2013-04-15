${set([
  pageTitle = "Assetora",
  jsList.push("modules/assetora"),
  inav = "assetora"
])}  
{{partial "head.tpl"}}

{{verbatim}}
<div class="container ng-cloak" data-ng-controller="AssetoraCtrl">

  <div class="row">
    <div class="title-section span12">
      <h1 class="headline">Assetora</h1>
      
      <p>Assetora is a service that makes it easier for you to sell the
      creations you host on your website. Using Assetora, you can set what
      your customers will see when they try to purchase items from your
      website and set the parameters for what they'll pay you (or others) in
      order to gain access to those items.</p>
      <p>This service provides you with the tools to design assets and listings
      for your creations. An asset describes your creation and may optionally
      set royalties for it if you want to allow other people to resell your
      work. A listing sets the price and licensing terms for purchasing an
      asset. Assetora allows you to host both asset descriptions and listings
      directly on Meritora, which means there's less for you to set up before
      you can start selling.</p>
    </div>
  </div>
  
  <div class="row">
    <div class="section span12">
      <h3 class="headline">Search</h3>
      <form class="form-search">
        <input type="text" name="search" class="input-xlarge search-query"
          data-ng-model="model.search.input">
        <span data-input-watcher="model.search.input"
          data-input-watcher-state="model.search.state"
          data-input-change="search(input, state, callback)">
        </span>
        <span data-spinner="model.search.state.loading || state.assets.loading || state.listings.loading"
          data-spinner-class="append-btn-spinner"></span>
        <button data-ng-show="!(model.search.state.loading || state.assets.loading || state.listings.loading)"
          class="btn btn-success btn-add"
          data-ng-click="model.modals.showAddAsset=true"><i class="icon-plus icon-white"></i> Add Asset</button>
      </form>
    </div>
    <div data-modal-add-asset="model.modals.showAddAsset"></div>
    <div data-modal-add-listing="model.modals.showAddListing"
      data-asset="model.currentAsset"></div>
  </div>
  
  <div class="row">
    <div class="section section-asset-search span6">
      <h3 class="headline">Asset Search Results</h3>
      
      <table class="table table-condensed"
        data-ng-show="!state.assets.loading && model.search.assets.length > 0">
        <thead>
          <tr>
            <th class="date">Date</th>
            <th class="name">Title</th>
            <th class="name">Creator</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="asset in model.search.assets" class="asset"
            data-fadein="asset.added">
            <!-- Date -->
            <td>
              <span class="date">{{asset.created | date:'medium'}}</span>
            </td>
            <!-- Title -->
            <td>
              <span class="name">{{asset.title}}</span>
            </td>
            <!-- Creator -->
            <td>
              <span class="name">{{asset.creator.fullName}}</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr data-ng-show="state.assets.loading">
            <td colspan="3" style="text-align: center">
              <span class="center">
                <span data-spinner="state.assets.loading" data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.assets.loading && model.search.assets.length == 0">
        <p class="center">No matches.</p>
      </div>
    </div>
  
    <div class="section section-listing-search span6">
      <h3 class="headline">Listing Search Results</h3>
      
      <table class="table table-condensed"
        data-ng-show="!state.listings.loading && model.search.listings.length > 0">
        <thead>
          <tr>
            <th class="date">Date</th>
            <th class="name">Title</th>
            <th class="name">Creator</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="listing in model.search.listings" class="listing"
            data-fadein="listing.added">
            <!-- Date -->
            <td>
              <span class="date">{{listing.asset.created | date:'medium'}}</span>
            </td>
            <!-- Title -->
            <td>
              <span class="name">{{listing.asset.title}}</span>
            </td>
            <!-- Creator -->
            <td>
              <span class="name">{{listing.asset.creator.fullName}}</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr data-ng-show="state.listings.loading">
            <td colspan="3" style="text-align: center">
              <span class="center">
                <span data-spinner="state.listings.loading" data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.listings.loading && model.search.listings.length == 0">
        <p class="center">No matches.</p>
      </div>
    </div>
  </div>  
  
  <div class="row">
    <div class="section section-recent-assets span6">
      <h3 class="headline">Recent Assets</h3>
      
      <table class="table table-condensed" data-ng-show="state.assets.loading || model.recentAssets.length > 0">
        <thead>
          <tr>
            <th class="date">Date</th>
            <th class="name">Title</th>
            <th class="name">Creator</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="asset in model.recentAssets" class="asset"
            data-fadein="asset.added">
            <!-- Date -->
            <td>
              <span class="date">{{asset.created | date:'medium'}}</span>
            </td>
            <!-- Title -->
            <td>
              <span class="name">{{asset.title}}</span>
            </td>
            <!-- Creator -->
            <td>
              <span class="name">{{asset.creator.fullName}}</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr data-ng-show="state.assets.loading">
            <td colspan="3" style="text-align: center">
              <span class="center">
                <span data-spinner="state.assets.loading" data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.assets.loading && model.recentAssets.length == 0">
        <p class="center">You have no recent assets for this identity.</p>
      </div>
    </div>
  
    <div class="section section-recent-listings span6">
      <h3 class="headline">Recent Listings</h3>
      
      <table class="table table-condensed" data-ng-show="state.listings.loading || model.recentListings.length > 0">
        <thead>
          <tr>
            <th class="date">Date</th>
            <th class="name">Title</th>
            <th class="name">Creator</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="listing in model.recentListings" class="listing"
            data-fadein="listing.added">
            <!-- Date -->
            <td>
              <span class="date">{{listing.asset.created | date:'medium'}}</span>
            </td>
            <!-- Title -->
            <td>
              <span class="name">{{listing.asset.title}}</span>
            </td>
            <!-- Creator -->
            <td>
              <span class="name">{{listing.asset.creator.fullName}}</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr data-ng-show="state.listings.loading">
            <td colspan="3" style="text-align: center">
              <span class="center">
                <span data-spinner="state.listings.loading" data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.listings.loading && model.recentListings.length == 0">
        <p class="center">You have no recent listings for this identity.</p>
      </div>
    </div>
  </div>

</div>
{{/verbatim}}

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
