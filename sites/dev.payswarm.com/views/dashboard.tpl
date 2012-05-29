${set([
  pageTitle = "Identity Dashboard",
  cssList.push("identities"),
  jsList.push("common/scripts/tmpl.funcs.countries"),
  jsList.push("common/scripts/identity.dashboard"),
  jsList.push("common/scripts/website.management"),
  jsList.push("common/scripts/modals.add-account"),
  jsList.push("common/scripts/modals.add-address"),
  jsList.push("common/scripts/modals.add-budget"),
  jsList.push("common/scripts/modals.add-payment-token"),
  jsList.push("common/scripts/modals.deposit"),
  jsList.push("common/scripts/modals.edit-account"),
  jsList.push("common/scripts/modals.edit-budget"),
  inav = "dashboard"
])}  
{{! set(jsList.push("common/scripts/identity"))}}
{{! partial "identity/identity-nav.tpl"}}

{{partial "site/head.tpl"}}
{{partial "modals/add-account.tpl"}}
{{partial "modals/add-address.tpl"}}
{{partial "modals/add-budget.tpl"}}
{{partial "modals/add-payment-token.tpl"}}
{{partial "modals/deposit.tpl"}}
{{partial "modals/edit-account.tpl"}}
{{partial "modals/edit-budget.tpl"}}

{{verbatim}}
<script id="accounts-tmpl" type="text/x-jquery-tmpl">
  {{each(idx, account) accounts}}
  <tr id="account-${account["@id"]}" about="${account["@id"]}" class="account resource">
    <td>
      <a href="/financial/activity?account=${encodeURIComponent(account["@id"])}">${account["rdfs:label"]}</a>{{if account["psa:status"] != "active"}} <span class="disabled">(Disabled)</span>{{/if}}
    </td>
    <td class="money">
      <span class="auto-tooltip" 
        data-original-title="Since we support micro-payments, we track your account balance very accurately. The exact amount in this account is ${account["com:currency"]} $ ${account["com:balance"]}."
        data-placement="bottom" data-trigger="hover"><span class="currency">${account["com:currency"]} $</span> ${tmpl.decimal(account["com:balance"], 'down', '2')}</span>
    </td>
    <td class="action">
      <button class="btn deposit" data-toggle="modal" title="Deposit"><i class="icon-plus"></i></button>
    </td>
    <td class="action">
      <button class="btn edit" data-toggle="modal" title="Edit"><i class="icon-pencil"></i></button>
    </td>
  </tr>
  {{/each}}
</script>

<script id="budgets-tmpl" type="text/x-jquery-tmpl">
  {{each(idx, budget) budgets}}
  <tr id="budget-${budget["@id"]}" about="${budget["@id"]}" class="budget resource">
    <td class="name">
      <!--<a href="${budget["@id"]}">${budget["rdfs:label"]}</a>-->
      <span title="${budget["@id"]}">${budget["rdfs:label"]}</span>
    </td>
    <td class="money">
      {{! FIXME: add currency }}
      <div class="progress ${tmpl.progessMeterClass(budget["com:balance"], budget["com:amount"])} progress-striped no-margin">
        <div class="bar" style="width: ${tmpl.percentage(budget["com:balance"], budget["com:amount"])};"></div>
      </div>
      <span title="$ ${budget["com:balance"]}"><span class="currency">$</span> ${tmpl.decimal(budget["com:balance"], 'down', '2')}</span> /
      <span title="$ ${budget["com:amount"]}"><span class="currency">$</span> ${tmpl.decimal(budget["com:amount"], 'down', '2')}</span>
    </td>
    <td>
      {{if budget["psa:refresh"] == "psa:Hourly"}}Hourly{{/if}}
      {{if budget["psa:refresh"] == "psa:Daily"}}Daily{{/if}}
      {{if budget["psa:refresh"] == "psa:Monthly"}}Monthly{{/if}}
      {{if budget["psa:refresh"] == "psa:Yearly"}}Yearly{{/if}}
    </td>
    <td class="action">
      <button class="btn edit" data-toggle="modal" title="Edit"><i class="icon-pencil"></i></button>
    </td>
    <td class="action">
      <a class="btn btn-danger resource-delete" href="#" title="Delete"><i class="icon-remove icon-white" /></a>
    </td>
  </tr>
  {{/each}}
</script>

<script id="addresses-tmpl" type="text/x-jquery-tmpl">
  {{each(idx, address) addresses}}
  {{/each}}
</script>
{{/verbatim}}

<div class="container">

  <div class="row">
    <div class="span12">
      <h1 class="headline">Dashboard</h1>
      <h3 class="subheadline">Recent activity and status</h3>
      <hr />
    </div>
  </div>
    
  <div class="row">
    <div class="span6">
      <h3 class="headline">Accounts</h3>
      <div id="accounts">
        <table class="table table-condensed hasresources hide">
           <thead>
              <tr>
                 <th class="name">Account</th>
                 <th class="money">Balance</th>
                 <th class="action">Deposit</th>
                 <th class="action">Edit</th>
              </tr>
           </thead>
           <tbody class="resources"></tbody>
        </table>
        
        <div class="noresources hide">
          <h3 class="center">No Accounts</h3>
          <p class="center">You have no accounts configured for this identity.</p>
        </div>
        
        <div class="loading">
          <p class="center">Loading Accounts...</p>
        </div>
      </div>
      <div><button id="button-add-account" class="btn btn-success"><i class="icon-plus icon-white"></i> Add Account</button></div>
    </div>
    
    <div class="span6">
      <h3 class="headline">Budgets</h3>
      
      <div id="budgets">
        <table class="table table-condensed hasresources hide">
           <thead>
              <tr>
                 <th class="name">Budget</th>
                 <th class="money">Balance</th>
                 <th>Refresh</th>
                 <th class="action">Edit</th>
                 <th class="action">Delete</th>
              </tr>
           </thead>
           <tbody class="resources"></tbody>
        </table>
        
        <div class="noresources hide">
          <h3 class="center">No Budgets</h3>
          <p class="center">You have no budgets configured for this identity.</p>
        </div>
        
        <div class="loading">
          <p class="center">Loading Budgets...</p>
        </div>
      </div>
      <div><button id="button-add-budget" class="btn btn-success"><i class="icon-plus icon-white"></i> Add Budget</button></div>
    </div>
    
  </div>
</div>

{{! mode warning }}
{{if productionMode == false}}
<hr />
<div class="alert alert-info">
  <strong>NOTE:</strong> This is a demonstration website that does not use real money. Please do not enter any sensitive personal information. [<a href="http://payswarm.com/wiki/Demo_Warning">more info...</a>]
</div>
{{/if}}

{{partial "site/foot.tpl"}}
