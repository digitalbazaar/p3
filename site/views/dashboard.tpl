${set([
  pageTitle = "Identity Dashboard",
  jsList.push("legacy/tmpl.funcs.countries"),
  jsList.push("modules/dashboard"),
  jsList.push("legacy/modals.add-account"),
  jsList.push("legacy/modals.add-address"),
  jsList.push("legacy/modals.add-budget"),
  jsList.push("legacy/modals.add-payment-token"),
  jsList.push("legacy/modals.deposit"),
  inav = "dashboard"
])}  

{{partial "head.tpl"}}
{{partial "legacy/modals/add-account.tpl"}}
{{partial "legacy/modals/add-address.tpl"}}
{{partial "legacy/modals/add-payment-token.tpl"}}
{{partial "legacy/modals/deposit.tpl"}}
{{partial "legacy/modals/edit-account.tpl"}}

{{verbatim}}
<div class="dashboard container ng-cloak" data-ng-controller="DashboardCtrl">

  <div class="row">
    <div class="title-section span12">
      <h1 class="headline">Dashboard <span class="subheadline">Recent activity and status</span></h3>
    </div>
  </div>
    
  <div class="row">
    <div class="section span6">
      <h3 class="headline">Accounts</h3>
      <table class="table table-condensed" data-ng-show="state.accounts.loading || accounts.length > 0">
        <thead>
          <tr>
            <th class="name">Account</th>
            <th class="money">Balance</th>
            <th class="action">Deposit</th>
            <th class="action">Edit</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="account in accounts | orderBy:'label'" class="account">
            <!-- Label -->
            <td>
              <a href="{{account.id}}?view=activity">{{account.label}}</a><span data-ng-show="account.psaStatus != 'active'" class="disabled">(Disabled)</span>
            </td>
            <!-- Balance -->
            <td class="money">
              <span class="money" data-tooltip-title="Since we support micro-payments, we track your account balance very accurately. The exact amount in this account is {{account.currency}} {{account.balance}}."
                data-placement="bottom" data-trigger="hover"><span class="currency">{{account.currency}}</span> {{account.balance | currency:'$'}}</span>
            </td>
            <!-- Deposit -->
            <td class="action">
              <button class="btn deposit" data-toggle="modal" title="Deposit" data-ng-click="deposit(account)"><i class="icon-plus"></i></button>
            </td>
            <!-- Edit -->
            <td class="action">
              <div data-modal-edit-account="showEditAccountModal"
                data-account="account"></div>
              <button class="btn edit" title="Edit"
                data-ng-click="showEditAccountModal=true"><i class="icon-pencil"></i></button>
            </td>
          </tr>
        </tbody>
        <tfoot data-ng-show="state.accounts.loading">
          <tr>
            <td colspan="4" style="text-align: center">
              <span class="center">
                <span data-spinner="state.accounts.loading" data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.accounts.loading && accounts.length == 0">
        <p class="center">You have no accounts configured for this identity.</p>
      </div>
      <div data-modal-add-account="showAddAccountModal"></div>
      <button data-ng-hide="state.accounts.loading" class="btn btn-success"
        data-ng-click="showAddAccountModal=true"><i class="icon-plus icon-white"></i> Add Account</button>
    </div>
    
    <div class="section span6">
      <h3 class="headline">Budgets</h3>
      <table class="table table-condensed" data-ng-show="state.budgets.loading || budgets.length > 0">
        <thead>
          <tr>
            <th class="name">Budget</th>
            <th class="money">Balance</th>
            <th>Refresh</th>
            <th class="action">Edit</th>
            <th class="action">Delete</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="budget in budgets | orderBy:'label'" class="budget" data-fadeout="budget.deleted">
            <!-- Label -->
            <td class="name">
              <span title="{{budget.id}}">{{budget.label}}</span>
            </td>
            <!-- Balance -->
            <td class="money">
              <div class="progress progress-striped no-margin" data-progress-divisor="budget.balance" data-progress-dividend="budget.amount">
                <div class="bar" data-bar-divisor="budget.balance" data-bar-dividend="budget.amount"></div>
              </div>
              <span class="currency">USD</span>
              <span data-tooltip-title="USD ${{budget.balance}}">{{budget.balance | currency:'$'}}</span> /
              <span data-tooltip-title="USD ${{budget.amount}}">{{budget.amount | currency:'$'}}</span>
            </td>
            <!-- Refresh -->
            <td data-ng-switch="budget.psaRefresh">
              <span data-ng-switch-when="psa:Hourly">Hourly</span>
              <span data-ng-switch-when="psa:Daily">Daily</span>
              <span data-ng-switch-when="psa:Monthly">Monthly</span>
              <span data-ng-switch-when="psa:Yearly">Yearly</span>
            </td>
            <!-- Edit -->
            <td class="action">
              <div data-modal-edit-budget="showEditBudgetModal"
                data-budget="budget"></div>
              <button class="btn edit" title="Edit"
                data-ng-click="showEditBudgetModal=true"><i class="icon-pencil"></i></button>
            </td>
            <!-- Delete -->
            <td class="action">
              <button class="btn btn-danger" title="Delete" data-ng-click="deleteBudget(budget)"><i class="icon-remove icon-white"></i></button>
            </td>
          </tr>
        </tbody>
        <tfoot data-ng-show="state.budgets.loading">
          <tr>
            <td colspan="5" style="text-align: center">
              <span class="center">
                <span data-spinner="state.budgets.loading" data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.budgets.loading && budgets.length == 0">
        <p class="center">You have no budgets configured for this identity.</p>
      </div>
      <div data-modal-add-budget="showAddBudgetModal"></div>
      <button data-ng-hide="state.budgets.loading" class="btn btn-success"
        data-ng-click="showAddBudgetModal=true"><i class="icon-plus icon-white"></i> Add Budget</button>
    </div>
  </div>

  <div class="row">
    <div class="section span6">
      <h3 class="headline">Recent Transactions</h3>
      
      <table class="table table-condensed" data-ng-show="state.txns.loading || txns.length > 0">
        <thead>
          <tr>
            <th class="date">Date</th>
            <th class="name">Item</th>
            <th class="money">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="txn in txns" class="txn" data-fadein="txn.added">
            <!-- Date -->
            <td data-ng-switch="getTxnType(txn)">
              <span data-ng-switch-when="deposit" class="date">{{txn.created | date:'MMMM, dd yyyy @ h:mm:ss a'}}</span>
              <span data-ng-switch-when="contract" class="date">{{txn.created | date:'MMMM, dd yyyy @ h:mm:ss a'}}</span>
              <span data-ng-switch-when="withdrawal" class="date">{{txn.created | date:'MMMM, dd yyyy @ h:mm:ss a'}}</span>
            </td>
            <!-- Item -->
            <td data-ng-switch="getTxnType(txn)">
              <span data-ng-switch-when="deposit" class="name"><a href="{{txn.id}}"><i class="icon-plus"></i> Deposit</a> <span data-ng-show="!(txn.settled || txn.voided)" class="label label-info">Pending</span><span data-ng-show="txn.voided" class="label label-important">Voided</span></span>
              <span data-ng-switch-when="contract" class="name"><a href="{{txn.id}}"><i class="icon-shopping-cart"></i> {{txn.asset.title}}</a> <span data-ng-show="!(txn.settled || txn.voided)" class="label label-info">Pending</span><span data-ng-show="txn.voided" class="label label-important">Voided</span></span>
              <span data-ng-switch-when="withdrawal" class="name"><a href="{{txn.id}}"><i class="icon-minus"></i> Withdrawal</a> <span data-ng-show="!(txn.settled || txn.voided)" class="label label-info">Pending</span><span data-ng-show="txn.voided" class="label label-important">Voided</span></span>
            </td>
            <!-- Amount -->
            <td class="money">
              <span class="money" data-tooltip-title="Since we support micro-payments, we track transaction amounts very accurately. The exact amount of this transaction is {{txn.currency}} {{txn.amount}}."
                data-placement="bottom" data-trigger="hover"><span class="currency">USD</span> {{txn.amount | currency:'$'}}</span>
            </td>
          </tr>
        </tbody>
        <tfoot data-ng-show="state.txns.loading">
          <tr>
            <td colspan="5" style="text-align: center">
              <span class="center">
                <span data-spinner="state.txns.loading" data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.txns.loading && txns.length == 0">
        <h3 class="center">No Transactions</h3>
        <p class="center">You have no recent transactions for this identity.</p>
      </div>
      <span>
      <a href="accounts?view=activity"><button class="btn"><i class="icon-list"></i> More <i class="icon-chevron-right"></i></button></a>
    </div>
  </div>
</div>
{{/verbatim}}

{{! mode warning }}
{{if productionMode == false}}
<hr />
<div class="alert alert-info">
  <strong>NOTE:</strong> This is a demonstration website that does not use real money. Please do not enter any sensitive personal information. [<a href="http://payswarm.com/wiki/Demo_Warning">more info...</a>]
</div>
{{/if}}

{{partial "foot.tpl"}}
