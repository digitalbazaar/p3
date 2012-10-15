${set([
  pageTitle = "Transaction Activity",
  jsList.push("modules/activity")
])}
{{partial "head.tpl"}}

<div data-ng-controller="ActivityCtrl" class="ng-cloak">

{{if session.auth}}
{{verbatim}}
<ul class="breadcrumb">
  <li>
    <a href="{{session.identity.id}}/dashboard">Dashboard ({{session.identity.label}}) </a> <span class="divider">/</span>
  </li>
  <li>
    Accounts <span class="divider" ng-show="account">/</span>
  </li>
  <li class="active">
    {{account.label}}
  </li>
</ul>
{{/verbatim}}
{{else}}
  {{if account.label}}
<ul class="breadcrumb">
  <li>{{account.label}}</li>
</ul>
  {{/if}}
{{/if}}

{{verbatim}}
<h2 class="headline">Account Activity at or before {{startDate | date:'medium'}}</h2>

<div class="well">
  <span class="pull-right" data-ng-show="txn.length > 0">
    Showing {{txns.length}} <span
      data-ng-pluralize="" data-count="txns.length"
      data-when="{'1': 'transaction', 'other': 'transactions'}"></span>
  </span>
  
  <form class="form-horizontal" action="">
    <fieldset>
      <div class="control-group">
        <label class="control-label" for="dateField">Start Date</label> 
        <div class="controls">
          <input name="dateField" type="text"
            data-ng-model="textDate"
            data-ui-date="" data-ng-change="dateChanged()"
            data-ui-keypress="{13: 'dateQuitKeyPressed($event)', 27: 'dateQuitKeyPressed($event)'}" />
        </div>
      </div>
    </fieldset>
  </form>
</div>

<table class="table table-condensed" data-ng-show="loading || txns.length > 0">
  <thead>
    <tr>
      <th class="date">Date</th>
      <th class="name">Item</th>
      <th class="money">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr data-ng-repeat="row in table" data-ng-hide="row.hidden">
      <!-- Date -->
      <td data-ng-switch="getRowType(row)" data-ng-click="toggleDetails(row)" style="max-width: 150px;">
        <span data-ng-switch-when="deposit" class="date">{{row.created | date:'medium'}}</span>
        <span data-ng-switch-when="contract" class="date">{{row.created | date:'medium'}}</span>
        <span data-ng-switch-when="withdrawal" class="date">{{row.created | date:'medium'}}</span>
        <span data-ng-switch-when="transfer">&nbsp;</span>
      </td>
      <!-- Item -->
      <td data-ng-switch="getRowType(row)" data-ng-click="toggleDetails(row)">
        <span data-ng-switch-when="deposit" class="name"><i class="icon-plus"></i> Deposit <span data-ng-show="!(row.settled || row.voided)" class="label label-info">Pending</span><span data-ng-show="row.voided" class="label label-important">Voided</span><div data-ng-show="row.detailsVisible"><a href="{{row.id}}">View detailed receipt...</a></div></span>
        <span data-ng-switch-when="contract" class="name"><i class="icon-shopping-cart"></i> {{row.asset.title}} <span data-ng-show="!(row.settled || row.voided)" class="label label-info">Pending</span><span data-ng-show="row.voided" class="label label-important">Voided</span><div data-ng-show="row.detailsVisible"><a href="{{row.id}}">View detailed receipt...</a></div></span>
        <span data-ng-switch-when="withdrawal" class="name"><i class="icon-minus"></i> Withdrawal <span data-ng-show="!(row.settled || row.voided)" class="label label-info">Pending</span><span data-ng-show="row.voided" class="label label-important">Voided</span><div data-ng-show="row.detailsVisible"><a href="{{row.id}}">View detailed receipt...</a></div></span>
        <span data-ng-switch-when="transfer">
          <i class="icon-info-sign" title="Details"></i> {{row.comment}}<br/>
          <i class="icon-minus" title="Source Account"></i> <a data-ng-show="row.sourceLink" href="{{row.source}}">{{row.source}}</a><span data-ng-hide="row.sourceLink">{{row.source}}</span> <br/>
          <i class="icon-plus" title="Destination Account"></i> <a data-ng-show="row.destinationLink" href="{{row.destination}}">{{row.destination}}</a><span data-ng-hide="row.destinationLink">{{row.destination}}</span>
        </span>
      </td>
      <!-- Amount -->
      <td class="money" data-ng-click="toggleDetails(row)">
        <span class="money" data-tooltip-title="Since we support micro-payments, we track transaction amounts very accurately. The exact amount of this transaction is USD {{row.amount}}."
          data-placement="bottom" data-trigger="hover"><span class="currency">USD</span> {{row.amount | ceil | currency:'$'}}</span>
      </td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="4" style="text-align: center">
        <span class="center">
          <button data-ng-hide="loading" class="btn" data-ng-click="getMore()"><i class="icon-list"></i> More <i class="icon-chevron-right"></i></button>
          <span data-spinner="loading" data-spinner-class="table-spinner"></span>
        </span>
      </td>
    </tr>
    <tr>
      <td colspan="4"><p class="alert alert-info micropayment-note">PaySwarm uses a micro-accounting system that is accurate to 7 monetary digits.<br />Using your mouse, hover over an individual amount to see its exact value.</p></td>
    </tr>
  </tfoot>
</table>

<div data-ng-show="!loading && txns.length == 0">
  <h2 class="center">No Transactions</h2>
  <p class="center">There are no transactions recorded for this account before the given date.</p>
</div>

</div>
{{/verbatim}}

{{partial "foot.tpl"}}
