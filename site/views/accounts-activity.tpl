${set([
  pageTitle = "Account Activity",
  jsList.push("common/scripts/activity"),
  pagingInfo = transactions,
  pagingUrl = "/financial/activity"
])}
{{partial "site/head.tpl"}}

<ul class="breadcrumb">
  <li>
    <a href="${session.identity.id]}/dashboard">Dashboard (${session.identity.label}) </a> <span class="divider">/</span>
  </li>
  <li>
    Accounts {{if transactions.account}}<span class="divider">/</span>{{/if}}
  </li>
  {{if transactions.account}}
  <li class="active">
    ${transactions.account.label}
  </li>
  {{/if}}
</ul>

<h2 class="headline">${pageTitle}</h2>

<h3 class="headline">
  {{if transactions.resources.length > 0}}
  <span class="pull-right hasresources{{if transactions.resources.length == 0}} hidden{{/if}}">
  Results <span id="resrources-start">${transactions.resStart}</span>-<span id="resources-end">${transactions.resEnd}</span> of <span id="resources-total">${transactions.total}{{if transactions.more}}+{{/if}}</span>
  </span>
  {{/if}}

  ${transactions.begin} to ${transactions.end}   
</h3>

{{partial "paging.tpl"}}

<table class="table table-condensed {{if transactions.resources.length == 0}} hide{{/if}}">
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
  </tbody>
</table>

<div class="noresources{{if transactions.resources.length != 0}} hide{{/if}}">
  <h2 class="center">No Transactions</h2>
  <p class="center">There are no transactions recorded for this account.</p>
</div>

{{partial "paging.tpl"}}
{{partial "site/foot.tpl"}}
