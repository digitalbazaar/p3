${set([
  pageTitle = "Hosted Assets",
  jsList.push("modules/hostedAssets")
])}
{{partial "head.tpl"}}

{{verbatim}}
<div data-ng-controller="HostedAssetsCtrl" class="ng-cloak">

<div data-ng-show="model.query.assetContent">

<h2 class="headline">Assets available for Purchase</h2>

<table class="table table-hover table-condensed"
  data-ng-show="model.loading || model.assets.length > 0">
  <thead>
    <tr>
      <th class="date">Date</th>
      <th class="name">Title</th>
      <th class="name">Creator</th>
    </tr>
  </thead>
  <tbody>
    <tr data-ng-repeat="row in table"
      data-ng-hide="row.hidden"
      data-ng-click="(row.type == 'asset' && showListings(row.asset)) || (row.type == 'listing' && purchase(row.listing))">
      <!-- Date -->
      <td data-ng-switch="row.type">
        <span data-ng-switch-when="asset" class="date">{{asset.created | date:'medium'}}</span>
        <span data-ng-switch-when="listing" class="date">{{listing.psaPublished | date:'medium'}}</span>
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
<div data-ng-show="!model.loading && model.assets.length == 0">
  <p class="center">No matches.</p>
</div>

</div>

<div data-ng-hide="model.query.assetContent">
FIXME: Not implemented
</div>

{{/verbatim}}

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
