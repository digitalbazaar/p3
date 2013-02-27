${set(
  pageTitle = "Budget Details",
  jsList.push("modules/budget")
)}
{{partial "head.tpl"}}

<div class="row">
  <h2 class="headline">${pageTitle}</h2>
</div>

{{verbatim}}
<div data-ng-controller="BudgetCtrl" class="ng-cloak">

<table class="table table-condensed table-hover">
<tr>
  <td>Id</td>
  <td>{{budget.id}}</td>
</tr>
<tr>
  <td>Label</td>
  <td>{{budget.label}}</td>
</tr>
<tr>
  <td>Total Amount</td>
  <td class="money">
    <span class="currency">USD</span>
    <span class="money right" title="USD ${{budget.amount}}">
      {{budget.amount | floor | currency:'$'}}
    </span>
  </td>
</tr>
<tr>
  <td>Current Balance</td>
  <td class="money">
    <span class="currency">USD</span>
    <span class="money right" title="USD ${{budget.balance}}">
      {{budget.balance | floor | currency:'$'}}
    </span>
  </td>
</tr>
<tr>
  <td>Max Per Use</td>
  <td class="money">
    <span class="currency">USD</span>
    <span class="money right" title="USD ${{budget.psaMaxPerUse}}">
      {{budget.psaMaxPerUse | floor | currency:'$'}}
    </span>
  </td>
</tr>
<tr>
  <td>Refill</td>
  <td data-ng-switch="getRefreshDuration(budget)">
    <span data-ng-switch-when="never">Never</span>
    <span data-ng-switch-when="R/PT1H">Hourly</span>
    <span data-ng-switch-when="R/P1D">Daily</span>
    <span data-ng-switch-when="R/P1W">Weekly</span>
    <span data-ng-switch-when="R/P1M">Monthly</span>
    <span data-ng-switch-when="R/P1Y">Yearly</span>
  </td>
</tr>
<tr>
  <td>Last Refreshed</td>
  <td>{{getLastRefresh(budget.psaRefreshInterval) | date:'medium'}}</td>
</tr>
<tr>
  <td>Expires</td>
  <td>{{getExpiration(budget.psaValidityInterval) | date:'medium'}}</td>
</tr>
<tr>
  <td>Source</td>
  <td>
    <div data-account-selector data-selected="account"
      data-invalid="invalidAccount" data-fixed="true"></div>
  </td>
</tr>
<tr>
  <td>Vendors</td>
  <td data-ng-show="state.loading || budget.vendor.length > 0">
    <table class="table table-condensed">
      <thead>
        <tr>
          <th class="name">Vendor</th>
          <th class="name">Website</th>
          <th class="action">Delete</th>
        </tr>
      </thead>
      <tbody>
        <tr data-ng-repeat="vendor in vendors[budget.id].vendors | orderBy:'label'"
          class="vendor"
          data-fadeout="vendor.deleted"
          data-fadeout-callback="deleteVendor(vendor)">
          <!-- Label -->
          <td class="name">
            <a href="{{vendor.id}}">{{vendor.label || vendor.id}}</a>
          </td>
          <td class="name">
            <a data-ng-show="vendor.homepage" href="{{vendor.homepage}}">{{vendor.homepage}}</a>
            <span data-ng-hide="vendor.homepage">&nbsp;</span>
          </td>
          <!-- Delete -->
          <td class="action">
            <button class="btn btn-danger" title="Delete" data-ng-click="vendor.deleted=true"><i class="icon-remove icon-white"></i></button>
          </td>
        </tr>
      </tbody>
      <tfoot data-ng-show="state.loading">
        <tr>
          <td colspan="5" style="text-align: center">
            <span class="center">
              <span data-spinner="state.loading" data-spinner-class="table-spinner"></span>
            </span>
          </td>
        </tr>
      </tfoot>
    </table>
  </td>
  <td data-ng-show="!state.loading && budget.vendor.length == 0">
    You have no vendors configured for this budget.
  </td>
</table>

</div>
{{/verbatim}}

{{partial "foot.tpl"}}
