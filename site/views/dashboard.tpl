${set([
  pageTitle = "Identity Dashboard",
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
    <div class="section section-accounts span6">
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
              <a href="{{account.id}}?view=activity">{{account.label}}</a>
              <span data-ng-show="account.psaStatus != 'active'" class="disabled">(Disabled)</span>
              <span data-ng-show="(account.creditLimit && util.parseFloat(account.creditLimit) != 0) && (!account.backupSource || !account.backupSource.length)"
                data-tooltip-title="This account has no associated payment methods. Please edit the account information."
                data-placement="bottom" data-trigger="hover"><i class="icon icon-warning-sign"></i></span>
              <span data-ng-show="account.showExpirationWarning"
                data-tooltip-title="This account uses a payment method that will expire soon."
                data-placement="bottom" data-trigger="hover"><i class="icon icon-warning-sign"></i></span>
              <span data-ng-show="account.showExpired"
                data-tooltip-title="This account uses an expired payment method."
                data-placement="bottom" data-trigger="hover"><i class="icon icon-warning-sign"></i></span>
            </td>
            <!-- Balance -->
            <td class="money">
              <span data-account-bar="account"></span>
            </td>
            <!-- Action -->
            <td class="action">
              <div class="btn-group">
                <a href="#" class="btn dropdown-toggle" data-toggle="dropdown">
                  <i class="icon-chevron-down"></i>
                </a>
                <ul class="dropdown-menu pull-right">
                  <li>
                    <a data-ng-click="modals.account=account; modals.showDeposit=true">
                      <i class="icon-plus"></i> Deposit
                    </a>
                  </li>
                  <li>
                    <a data-ng-click="modals.account=account; modals.showWithdraw=true">
                      <i class="icon-minus"></i> Withdraw
                    </a>
                  </li>
                  <li>
                    <a data-ng-click="modals.account=account; modals.showEditAccount=true">
                      <i class="icon-pencil"></i> Edit
                    </a>
                  </li>
                  <li data-ng-show="!account.creditLimit || account.creditLimit == 0">
                    <a data-ng-click="modals.account=account; modals.showAddCreditLine=true">
                      <i class="icon-credit-card"></i> Open Credit Line
                    </a>
                  </li>
                  <li>
                    <a data-ng-click="modals.account=account; modals.showRedeemPromoCode=true">
                      <i class="icon-money"></i> Redeem Promo Code
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
                class="btn btn-success btn-add-account pull-right"
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
        <p class="center">You have no accounts for this identity.</p>
        <button
          class="btn btn-success btn-add-account pull-right"
          data-ng-click="modals.showAddAccount=true"><i class="icon-plus icon-white"></i> Add Account</button>
      </div>
      <div data-modal-deposit="modals.showDeposit"
        data-account="modals.account" data-instant="false"></div>
      <div data-modal-withdraw="modals.showWithdraw"
        data-account="modals.account"></div>
      <div data-modal-edit-account="modals.showEditAccount"
        data-account="modals.account"></div>
      <div data-modal-add-account="modals.showAddAccount"></div>
      <div data-modal-add-credit-line="modals.showAddCreditLine"
        data-account="modals.account"></div>
      <div data-modal-redeem-promo-code="modals.showRedeemPromoCode"
        data-account="modals.account"></div>
    </div>

    <div class="section section-budgets span6">
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
            data-fadeout="budget.deleted">
            <!-- Label -->
            <td class="name">
              <a href="{{budget.id}}">{{budget.label}}</a>
            </td>
            <!-- Balance -->
            <td class="money">
              <div data-budget-bar="budget"></div>
            </td>
            <!-- Refresh -->
            <td data-ng-switch="getBudgetRefreshDuration(budget)">
              <span data-ng-switch-when="never">Never</span>
              <span data-ng-switch-when="PT1H">Hourly</span>
              <span data-ng-switch-when="P1D">Daily</span>
              <span data-ng-switch-when="P1W">Weekly</span>
              <span data-ng-switch-when="P1M">Monthly</span>
              <span data-ng-switch-when="P1Y">Yearly</span>
            </td>
            <!-- Action -->
            <td class="action">
              <div class="btn-group">
                <a href="#" class="btn dropdown-toggle" data-toggle="dropdown">
                  <i class="icon-chevron-down"></i>
                </a>
                <ul class="dropdown-menu pull-right">
                  <li>
                    <a data-ng-click="modals.budget=budget; modals.showEditBudget=true">
                      <i class="icon-pencil"></i> Edit
                    </a>
                  </li>
                  <li class="divider"></li>
                  <li class="btn-danger">
                    <a data-ng-click="deleteBudget(budget)">
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
                class="btn btn-success btn-add-budget pull-right"
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
      <!-- Delete budget alert -->
      <div data-modal-alert="showDeleteBudgetAlert"
        data-modal-header="Warning"
        data-modal-ok="Delete"
        data-modal-cancel="Cancel"
        data-modal-on-close="confirmDeleteBudget(err, result)">
        <div>
          <p>Are you sure that you want to delete this budget?</p>
          <div data-budget-selector
            data-selected="budgetToDelete"
            data-invalid="invalidBudget" data-fixed="true"></div>
        </div>
      </div>
      <div data-ng-show="!state.budgets.loading && budgets.length == 0">
        <p class="center">You have no budgets for this identity.</p>
        <button
          class="btn btn-success btn-add-budget pull-right"
          data-ng-click="modals.showAddBudget=true"><i class="icon-plus icon-white"></i> Add Budget</button>
      </div>
      <div data-modal-edit-budget="modals.showEditBudget"
        data-budget="modals.budget"></div>
      <div data-modal-add-budget="modals.showAddBudget"></div>
    </div>
  </div>

  <div class="row">
    <div class="section section-recent-transactions span6">
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
          <tr data-ng-repeat="txn in txns" class="txn"
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
        <p class="center">You have no recent transactions for this identity.</p>
      </div>
    </div>

    <div class="section section-messages span6">
      <h3 class="headline">Messages</h3>
      <p class="center">You have no new messages.</p>
    </div>
  </div>

</div>
{{/verbatim}}

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
