${set([
  pageTitle = "Transaction Activity",
  jsList.push("common/scripts/transactions")
])}
{{partial "site/head.tpl"}}

{{verbatim}}
<div data-ng-app="activity" data-ng-controller="ActivityCtrl" class="ng-cloak">

<ul class="breadcrumb">
  <li>
    <a href="{{session.identity.id}}/dashboard">Dashboard ({{session.identity.label}}) </a> <span class="divider">/</span>
  </li>
  <li>
    Accounts <span class="divider">/</span>
  </li>
  <li class="active">
    {{account.label}}
  </li>
</ul>

<h2 class="headline">{{pageTitle}}</h2>

<h3 class="headline">
  <span class="pull-right hasresources{{txn.length && ' hide' || ''}}">
  Results <span id="resources-start">{{first}}</span>-<span id="resources-end">{{last}}</span> of <span id="resources-total">{{total}}{{mode && '+' || ''}}</span>
  </span>

  {{startDate | date:'MMMM, dd yyyy @ h:mm a'}} to {{endDate | date:'MMMM, dd yyyy @ h:mm a'}}   
</h3>

<table class="table table-condensed {{!txns.length && ' hide' || ''}}">
  <thead>
    <tr>
      <th class="date">Date</th>
      <th class="name">Item</th>
      <th class="money">Amount</th>
      <th class="action">Details</th>
    </tr>
  </thead>
  <tbody class="resources">
    <tr data-ng-repeat="row in table" class="{{row.hidden && 'hide' || ''}}">
      <!-- Date -->
      <td data-ng-switch="getRowType(row)">
        <span data-ng-switch-when="deposit" class="date">{{row.created}}</span>
        <span data-ng-switch-when="contract" class="date">{{row.created}}</span>
        <span data-ng-switch-when="transfer">&nbsp;</span>
      </td>
      <!-- Item -->
      <td data-ng-switch="getRowType(row)">
        <span data-ng-switch-when="deposit" class="name"><i class="icon-plus"></i> Deposit</span>
        <span data-ng-switch-when="contract" class="name"><i class="icon-shopping-cart"></i> {{row.asset.title}}</span>
        <span data-ng-switch-when="transfer">
          <i class="icon-info-sign" title="Details"></i> {{row.comment}}<br/>
          <i class="icon-minus" title="Source Account"></i> <a href="{{row.source}}">{{row.source}}</a><br/>
          <i class="icon-plus" title="Destination Account"></i> <a href="{{row.destination}}">{{row.destination}}</a>
        </span>
      </td>
      <!-- Amount -->
      <td class="money">
        <span class="money right" title="USD ${{row.amount}}">
          <span class="currency">USD</span> $ {{row.amount}}
        </span>
      </td>
      <!-- Details -->
      <td data-ng-switch="getRowType(row)">
        <span data-ng-switch-when="deposit" class="action"><a class="btn btn-info expand" href="#" title="Details" data-ng-click="toggleDetails(row)"><i class="icon-info-sign"></i></a></span>
        <span data-ng-switch-when="contract" class="action"><a class="btn btn-info expand" href="#" title="Details" data-ng-click="toggleDetails(row)"><i class="icon-info-sign"></i></a></span>
        <span data-ng-switch-when="transfer">&nbsp;</span>
      </td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="4" style="text-align: center">
        <span class="center">
          <button class="btn btn-primary" data-ng-click="getMore()">More <i class="icon-chevron-down icon-white"></i></button>
        </span>
      </td>
    </tr>
    <tr>
      <td colspan="4"><p class="alert alert-info micropayment-note">PaySwarm uses a micro-accounting system that is accurate to 7 monetary digits.<br />Using your mouse, hover over an individual amount to see its exact value.</p></td>
    </tr>
  </tfoot>
</table>

<div class="noresources{{txns.length && ' hide' || ''}}">
  <h2 class="center">No Transactions</h2>
  <p class="center">There are no transactions recorded for this account.</p>
</div>

</div>
{{/verbatim}}

{{partial "site/foot.tpl"}}
