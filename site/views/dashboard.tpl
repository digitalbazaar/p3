${set([
  pageTitle = "Identity Dashboard",
  jsList.push("modules/dashboard"),
  inav = "dashboard"
])}  

{{partial "head.tpl"}}

{{verbatim}}
<div class="dashboard container ng-cloak" data-ng-controller="DashboardCtrl">

  <div class="row">
    <div class="title-section span12">
      <h1 class="headline">Dashboard</h1>
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
            <th class="action">Action</th>
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
                data-placement="bottom" data-trigger="hover"><span class="currency">{{account.currency}}</span> {{account.balance | floor | currency:'$'}}</span>
            </td>
            <!-- Action -->
            <td class="action">
              <div class="btn-group">
                <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
                  <i class="icon-chevron-down"></i>
                </a>
                <ul class="dropdown-menu">
                  <li>
                    <a href="#" data-ng-click="modals.account=account; modals.showDeposit=true">
                      <i class="icon-plus"></i> Deposit
                    </a>
                  </li>
                  <li>
                    <a href="#" data-ng-click="modals.account=account; modals.showWithdraw=true">
                      <i class="icon-minus"></i> Withdraw
                    </a>
                  </li>
                  <li>
                    <a href="#" data-ng-click="modals.account=account; modals.showEditAccount=true">
                      <i class="icon-pencil"></i> Edit
                    </a>
                  </li>
                </ul>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr data-ng-hide="state.accounts.loading">
            <!-- Add Account -->
            <td colspan="3">
              <button 
                class="btn btn-success pull-right"
                data-ng-click="modals.showAddAccount=true"><i class="icon-plus icon-white"></i> Add Account</button>
            </td>
          </tr>
          <tr data-ng-show="state.accounts.loading">
            <td colspan="3" style="text-align: center">
              <span class="center">
                <span data-spinner="state.accounts.loading"
                  data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.accounts.loading && accounts.length == 0">
        <p class="center">You have no accounts configured for this identity.</p>
        <button 
          class="btn btn-success pull-right"
          data-ng-click="modals.showAddAccount=true"><i class="icon-plus icon-white"></i> Add Account</button>
      </div>
      <div data-modal-deposit="modals.showDeposit"
        data-account="modals.account" data-instant="false"></div>
      <div data-modal-withdraw="modals.showWithdraw"
        data-account="modals.account"></div>
      <div data-modal-edit-account="modals.showEditAccount"
        data-account="modals.account"></div>
      <div data-modal-add-account="modals.showAddAccount"></div>
    </div>
    
    <div class="section span6">
      <h3 class="headline">Budgets</h3>
      <table class="table table-condensed" data-ng-show="state.budgets.loading || budgets.length > 0">
        <thead>
          <tr>
            <th class="name">Budget</th>
            <th class="money">Balance</th>
            <th>Refill</th>
            <th class="action">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr data-ng-repeat="budget in budgets | orderBy:'label'"
            class="budget"
            data-fadeout="budget.deleted"
            data-fadeout-callback="deleteBudget(budget)">
            <!-- Label -->
            <td class="name">
              <a href="{{budget.id}}">{{budget.label}}</a>
            </td>
            <!-- Balance -->
            <td class="money">
              <div class="progress progress-striped no-margin" data-progress-divisor="budget.balance" data-progress-dividend="budget.amount">
                <div class="bar" data-bar-divisor="budget.balance" data-bar-dividend="budget.amount"></div>
              </div>
              <span class="currency">USD</span>
              <span data-tooltip-title="USD ${{budget.balance}}">{{budget.balance | floor | currency:'$'}}</span> /
              <span data-tooltip-title="USD ${{budget.amount}}">{{budget.amount | floor | currency:'$'}}</span>
            </td>
            <!-- Refresh -->
            <td data-ng-switch="budget.psaRefresh">
              <span data-ng-switch-when="psa:Never">Never</span>
              <span data-ng-switch-when="psa:Hourly">Hourly</span>
              <span data-ng-switch-when="psa:Daily">Daily</span>
              <span data-ng-switch-when="psa:Monthly">Monthly</span>
              <span data-ng-switch-when="psa:Yearly">Yearly</span>
            </td>
            <!-- Action -->
            <td class="action">
              <div class="btn-group">
                <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
                  <i class="icon-chevron-down"></i>
                </a>
                <ul class="dropdown-menu">
                  <li>
                    <a href="#" data-ng-click="modals.budget=budget; modals.showEditBudget=true">
                      <i class="icon-pencil"></i> Edit
                    </a>
                  </li>
                  <li class="divider"></li>
                  <li class="btn-danger">
                    <a href="#" data-ng-click="budget.deleted=true">
                      <i class="icon-remove icon-white"></i> Delete
                    </a>
                  </li>
                </ul>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr data-ng-hide="state.budgets.loading">
            <td colspan="4">
              <button
                class="btn btn-success pull-right"
                data-ng-click="modals.showAddBudget=true"><i class="icon-plus icon-white"></i> Add Budget</button>
            </td>
          </tr>
          <tr data-ng-show="state.budgets.loading">
            <td colspan="4" style="text-align: center">
              <span class="center">
                <span data-spinner="state.budgets.loading"
                  data-spinner-class="table-spinner"></span>
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
      <div data-ng-show="!state.budgets.loading && budgets.length == 0">
        <p class="center">You have no budgets configured for this identity.</p>
        <button
          class="btn btn-success pull-right"
          data-ng-click="modals.showAddBudget=true"><i class="icon-plus icon-white"></i> Add Budget</button>
      </div>
      <div data-modal-edit-budget="modals.showEditBudget"
        data-budget="modals.budget"></div>
      <div data-modal-add-budget="modals.showAddBudget"></div>
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
          <tr data-ng-repeat="txn in txns | orderBy:'-created'" class="txn"
            data-ng-class="(!txn.settled && !txn.voided && 'info') || (txn.voided && 'error')"
            data-fadein="txn.added">
            <!-- Date -->
            <td data-ng-switch="getTxnType(txn)">
              <span data-ng-switch-when="deposit" class="date">{{txn.created | date:'medium'}}</span>
              <span data-ng-switch-when="contract" class="date">{{txn.created | date:'medium'}}</span>
              <span data-ng-switch-when="withdrawal" class="date">{{txn.created | date:'medium'}}</span>
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
                data-placement="bottom" data-trigger="hover"><span class="currency">USD</span> {{txn.amount | ceil | currency:'$'}}</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr data-ng-hide="state.txns.loading">
            <td colspan="5">
              <a href="accounts?view=activity" class="btn pull-right"><i class="icon-list"></i> More <i class="icon-chevron-right"></i></a>
            </td>
          </tr>
          <tr data-ng-show="state.txns.loading">
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
    </div>
    
    <div class="section span6">
      <h3 class="headline">Messages</h3>
      <p class="center">No new messages.</p>
    </div>
  </div>

</div>
{{/verbatim}}

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
