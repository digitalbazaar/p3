${set(
  pageTitle = "Budget Details",
  jsList.push("modules/budget")
)}
{{partial "head.tpl"}}

{{verbatim}}
<h2>Budget Details</h2>

<div data-ng-controller="BudgetCtrl" class="ng-cloak">

<table>
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
  <td data-ng-switch="budget.psaRefresh">
    <span data-ng-switch-when="psa:Never">Never</span>
    <span data-ng-switch-when="psa:Hourly">Hourly</span>
    <span data-ng-switch-when="psa:Daily">Daily</span>
    <span data-ng-switch-when="psa:Monthly">Monthly</span>
    <span data-ng-switch-when="psa:Yearly">Yearly</span>
  </td>
</tr>
<tr>
  <td>Last Refreshed</td>
  <td>{{(budget.psaRefreshed * 1000) | date:'medium'}}</td>
</tr>
<tr>
  <td>Expires</td>
  <td>{{(budget.psaExpires * 1000) | date:'medium'}}</td>
</tr>
<tr>
  <td>Source</td>
  <td>
    <div data-account-selector data-selected="account" data-fixed="true"></div>
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
        <tr data-ng-repeat="vendor in vendors[budget.id].vendors | orderBy:'label'" class="vendor" data-fadeout="budget.deleted">
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
            <button class="btn btn-danger" title="Delete" data-ng-click="deleteVendor(vendor)"><i class="icon-remove icon-white"></i></button>
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
