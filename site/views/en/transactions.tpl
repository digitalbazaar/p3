${set([
  pageTitle = "Transaction Activity",
  jsList.push("common/scripts/transactions")
])}
{{partial "site/head.tpl"}}

{{verbatim}}
<div data-ng-app="activity" data-ng-controller="ActivityCtrl">

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
  <span data-ng-repeat="txn in txns" class="pull-right hasresources{{txn.length && ' hidden' || ''}}">
  Results <span id="resources-start">{{resStart}}</span>-<span id="resources-end">{{resEnd}}</span> of <span id="resources-total">{{total}}{{mode && '+' || ''}}</span>
  </span>

  {{txnBegin}} to {{txnEnd}}   
</h3>

<table class="table table-condensed {{txns.length && ' hide' || ''}}">
  <thead>
    <tr>
      <th class="date">Date</th>
      <th class="name">Item</th>
      <th class="money">Amount</th>
      <th class="action">Details</th>
    </tr>
  </thead>
  <tfoot>
    <tr>
      <td colspan="4"><p class="alert alert-info micropayment-note">PaySwarm uses a micro-accounting system that is accurate to 7 monetary digits.<br />Using your mouse, hover over an individual amount to see its exact value.</p></td>
    </tr>
  </tfoot>
  <tbody class="resources">
  <!-- 
    {{each(tnum,transaction) transactions.resources}}
      ${set(tnum = tnum)}
      {{! FIXME: the transaction.type may match more than one }}
      {{each(idx,ta) transaction.type}}
        {{if ta == "ps:Contract"}}
          ${set(contract = transaction)}
          {{partial "activity-contract.tpl"}}
        {{/if}}
        {{if ta == "com:Deposit"}}
          ${set(deposit = transaction)}
          {{partial "activity-deposit.tpl"}}
        {{/if}}
      {{/each}}
    {{/each}}
  -->
  </tbody>
</table>

<div class="noresources{{!txns.length && ' hide' || ''}}">
  <h2 class="center">No Transactions</h2>
  <p class="center">There are no transactions recorded for this account.</p>
</div>

</div>
{{/verbatim}}

{{partial "site/foot.tpl"}}
