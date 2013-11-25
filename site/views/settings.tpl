${set([
  pageTitle = "Identity Settings",
  inav = "settings"
])}

{{partial "head.tpl"}}

{{verbatim}}
<div class="container ng-cloak">

  <div class="row">
    <div class="title-section span12">
      <h1 class="headline">Settings</h1>
    </div>
  </div>

  <div class="tabbable tabs-left first-tabbable">
    <ul class="nav nav-tabs">
      <li class="active"><a href="#external-accounts" data-toggle="tab">External Accounts</a></li>
      <li><a href="#addresses" data-toggle="tab">Addresses</a></li>
      <li><a href="#keys" data-toggle="tab">Access Keys</a></li>
    </ul>
    <div class="tab-content">
      <!-- External Accounts Tab -->
      <div class="container-fluid tab-pane active"
        id="external-accounts"
        data-ng-controller="ExternalAccountsCtrl">

        <div class="row-fluid">
          <div class="section span12">
            <h3 class="headline">Credit Cards</h3>
            <table class="table table-condensed" data-ng-show="state.loading || creditCards.length > 0">
              <thead>
                <tr>
                  <th class="name">Name</th>
                  <th class="name">Brand</th>
                  <th class="name">Number</th>
                  <th>Expiration</th>
                  <th class="compact">
                    <span
                      data-tooltip-title="Links from accounts to this payment method. A payment method cannot be deleted while linked."
                      data-placement="bottom" data-trigger="hover"><i class="icon icon-link"></i></span>
                  </th>
                  <th class="action">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr data-ng-repeat="card in creditCards | orderBy:'label'"
                  data-fadeout="card.deleted"
                  data-fadeout-callback="deletePaymentToken(card)"
                  data-fadein="card.showDeletedError"
                  data-fadein-callback="card.animateDeletedError=true"
                  data-animate="card.animateDeletedError"
                  data-animate-options="[{properties: {opacity: 0}, duration: 500},{properties: {opacity: 1}, duration: 500}]"
                  data-animate-callback="card.animateDeletedError=false;card.showDeletedError=false"
                  data-ng-class="{warning: card.showExpirationWarning, error: card.showExpired}">
                  <!-- Name -->
                  <td>
                    <span>{{card.label}}</span>
                  </td>
                  <!-- Brand -->
                  <td>
                    <span><i class="{{card.cardBrand|cardBrand:true}}"></i></span>
                  </td>
                  <!-- Number -->
                  <td>
                    <span>{{card.cardNumber}}</span>
                  </td>
                  <!-- Expiration -->
                  <td>
                    <!-- FIXME: add warning for near or already expired cards -->
                    <span>{{card.cardExpMonth}} / {{card.cardExpYear}}</span>
                    <span data-ng-show="card.showExpirationWarning"
                      data-tooltip-title="This payment method will expire in less than a month. Please update or replace the credit card information."
                      data-placement="bottom" data-trigger="hover"><i class="icon icon-warning-sign"></i></span>
                    <span data-ng-show="card.showExpired"
                      data-tooltip-title="This payment method has expired. Please update or replace the credit card information."
                      data-placement="bottom" data-trigger="hover"><i class="icon icon-warning-sign"></i></span>
                  </td>
                  <!-- Links -->
                  <td class="compact">
                    <span class="badge">{{card.backupSourceFor.length || ''}}</span>
                  </td>
                  <!-- Action -->
                  <td class="action">
                    <div class="btn-group">
                      <a href="#" class="btn dropdown-toggle" data-toggle="dropdown">
                        <i class="icon-chevron-down"></i>
                      </a>
                      <ul class="dropdown-menu pull-right">
                        <li>
                          <a data-ng-click="modals.paymentToken=card; modals.showEditPaymentToken=true">
                            <i class="icon-pencil"></i> Edit
                          </a>
                        </li>
                        <li class="divider"></li>
                        <li class="btn-danger">
                          <a data-ng-click="card.deleted=true">
                            <i class="icon-remove icon-white"></i> Delete
                          </a>
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr data-ng-hide="state.loading">
                  <!-- Add Credit Card -->
                  <td colspan="6">
                    <button
                      class="btn btn-success pull-right"
                      data-ng-click="modals.showAddCreditCard=true"><i class="icon-plus icon-white"></i> Add Credit Card</button>
                  </td>
                </tr>
                <tr data-ng-show="state.loading">
                  <td colspan="6" style="text-align: center">
                    <span class="center">
                      <span data-spinner="state.loading" data-spinner-class="table-spinner"></span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div data-ng-show="!state.loading && creditCards.length == 0">
              <p class="center">You have no credit cards associated with this identity.</p>
              <button
                class="btn btn-success pull-right"
                data-ng-click="modals.showAddCreditCard=true"><i class="icon-plus icon-white"></i> Add Credit Card</button>
            </div>
            <div
              data-feedback="creditCardFeedback"></div>
            <div data-modal-add-payment-token="modals.showAddCreditCard" data-payment-methods="creditCardMethods"></div>
            <div data-modal-edit-payment-token="modals.showEditPaymentToken"
               data-payment-token="modals.paymentToken"></div>
          </div>
        </div>

        <!-- Separator -->
        <div class="row-fluid">
          <div class="span12"></div>
        </div>

        <div class="row-fluid">
          <div class="section span12">
            <h3 class="headline">Bank Accounts</h3>
            <table class="table table-condensed" data-ng-show="state.loading || bankAccounts.length > 0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Number</th>
                  <th>Routing</th>
                  <th>Status</th>
                  <th class="action">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr data-ng-repeat="bankAccount in bankAccounts | orderBy:'label'"
                  data-ng-class="{info: bankAccount.psaStatus == 'active' && !bankAccount.psaVerified && bankAccount.psaVerifyReady}">
                  <!-- Name -->
                  <td>
                    <span>{{bankAccount.label}}</span>
                  </td>
                  <!-- Number -->
                  <td>
                    <span>{{bankAccount.bankAccount}}</span>
                  </td>
                  <!-- Routing -->
                  <td>
                    <span>{{bankAccount.bankRoutingNumber}}</span>
                  </td>
                  <!-- Status -->
                  <td data-ng-show="bankAccount.psaStatus == 'active' || bankAccount.psaStatus == 'disabled'">
                    <button data-ng-show="bankAccount.psaStatus == 'active' && !bankAccount.psaVerified && bankAccount.psaVerifyReady"
                      data-ng-click="modals.paymentToken=bankAccount; modals.showVerifyBankAccountModal=true"
                      class="btn btn-primary" title="Verify">Verify</button>
                    <span data-ng-show="bankAccount.psaStatus == 'disabled'"
                      data-tooltip-title="This payment method was likely disabled because your bank account information could not be verified. Please delete this payment method and try to add it again with corrected information."
                      data-placement="bottom" data-trigger="hover" class="label label-important">Disabled</span>
                    <span data-ng-show="bankAccount.psaStatus != 'active' && bankAccount.psaStatus != 'disabled' && bankAccount.psaStatus != 'deleted' && !bankAccount.psaVerified" class="label label-warning">Unverified</span>
                    <span data-ng-show="bankAccount.psaStatus == 'active' && !bankAccount.psaVerified && !bankAccount.psaVerifyReady" class="label label-info">Pending</span>
                    <span data-ng-show="bankAccount.psaVerified" class="label label-success">Verified</span>
                  </td>
                  <td data-ng-show="bankAccount.psaStatus == 'deleted'">
                    <span
                      data-tooltip-title="Because verifying a bank account is a costly process, we do not delete bank accounts immediately. You may restore the bank account before the expiration date passes if you wish."
                      data-placement="bottom" data-trigger="hover" class="label label-warning">Expires {{bankAccount.psaExpires | date:'MMM d'}}</span>
                  </td>
                  <!-- Action -->
                  <td class="action">
                    <div class="btn-group">
                      <a href="#" class="btn dropdown-toggle" data-toggle="dropdown">
                        <i class="icon-chevron-down"></i>
                      </a>
                      <ul class="dropdown-menu pull-right">
                        <li>
                          <a data-ng-click="modals.paymentToken=card; modals.showEditPaymentToken=true">
                            <i class="icon-pencil"></i> Edit
                          </a>
                        </li>
                        <li class="divider"></li>
                        <li class="btn-danger"
                          data-ng-show="bankAccount.psaStatus == 'active' || bankAccount.psaStatus == 'disabled'"
                          data-ng-disabled="!bankAccount.psaVerified && bankAccount.psaStatus != 'disabled'">
                          <a data-ng-click="deletePaymentToken(bankAccount)">
                            <i class="icon-trash icon-white"></i> Delete
                          </a>
                        </li>
                        <li class="btn-success"
                          data-ng-show="!bankAccount.psaStatus || bankAccount.psaStatus == 'deleted'">
                          <a data-ng-click="restorePaymentToken(bankAccount)">
                            <i class="icon-undo icon-white"></i> Restore
                          </a>
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr data-ng-hide="state.loading">
                  <!-- Add Bank Account -->
                  <td colspan="6">
                    <button
                      class="btn btn-success pull-right"
                      data-ng-click="modals.showAddBankAccount=true"><i class="icon-plus icon-white"></i> Add Bank Account</button>
                  </td>
                </tr>
                <tr data-ng-show="state.loading">
                  <td colspan="6" style="text-align: center">
                    <span class="center">
                      <span data-spinner="state.loading" data-spinner-class="table-spinner"></span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div data-ng-show="!state.loading && bankAccounts.length == 0">
              <p class="center">You have no bank accounts associated with this identity.</p>
              <button
                class="btn btn-success pull-right"
                data-ng-click="modals.showAddBankAccount=true"><i class="icon-plus icon-white"></i> Add Bank Account</button>
            </div>
            <div
              data-feedback="bankAccountFeedback"></div>
            <div data-modal-add-payment-token="modals.showAddBankAccount" data-payment-methods="bankAccountMethods"></div>
            <div data-modal-verify-bank-account="modals.showVerifyBankAccountModal"
               data-payment-token="modals.bankAccount"></div>
          </div>
        </div>
      </div>
      <!-- End External Accounts Tab -->

      <!-- Addresses Tab -->
      <div class="container-fluid tab-pane"
        id="addresses"
        data-ng-controller="AddressSettingsCtrl">
        <div class="row-fluid">
          <div class="section span12">
            <h3 class="headline">Addresses</h3>
            <table class="table table-condensed" data-ng-show="state.loading || addresses.length > 0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th class="action">Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr data-ng-repeat="address in addresses | orderBy:'label'">
                  <!-- Name -->
                  <td>
                    <span>{{address.label}}</span>
                  </td>
                  <!-- Address -->
                  <td>
                    <span data-vcard-address="address" data-no-label="true"></span>
                  </td>
                  <!-- Delete -->
                  <td class="action">
                    <button class="btn btn-danger" title="Delete" data-ng-click="deleteAddress(address)"><i class="icon-remove icon-white"></i></button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr data-ng-hide="state.loading">
                  <!-- Add Address -->
                  <td colspan="5">
                    <button
                      class="btn btn-success pull-right"
                      data-ng-click="modals.showAddAddress=true"><i class="icon-plus icon-white"></i> Add Address</button>
                  </td>
                </tr>
                <tr data-ng-show="state.loading">
                  <td colspan="5" style="text-align: center">
                    <span class="center">
                      <span data-spinner="state.loading" data-spinner-class="table-spinner"></span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div data-ng-show="!state.loading && addresses.length == 0">
              <p class="center">You have no addresses associated with this identity.</p>

              <div class="center alert">
                <button type="button" class="close" data-dismiss="alert">×</button>
                <strong>Warning!</strong>
                Without any addresses you are unable to buy or sell with this
                identity.
              </div>

              <button
                class="btn btn-success pull-right"
                data-ng-click="modals.showAddAddress=true"><i class="icon-plus icon-white"></i> Add Address</button>
            </div>
            <div data-modal-add-address="modals.showAddAddress" data-identity="identity"></div>
          </div>
        </div>
        <!-- Removing last address alert -->
        <div data-modal-alert="showLastAddressAlert"
          data-modal-header="Warning"
          data-modal-ok="Remove"
          data-modal-cancel="Cancel"
          data-modal-on-close="confirmDeleteAddress(err, result)">
          <p>Removing your last address will immediately prevent you from buying
          or selling with this identity. If you choose to remove your last
          address, you can re-enable buying and selling by adding a new
          address.</p>
          <p>Are you sure that you want to remove this address?</p>
        </div>
      </div>
      <!-- End Addresses Tab -->

      <!-- Keys Tab -->
      <div class="container-fluid tab-pane"
        id="keys"
        data-ng-controller="KeySettingsCtrl">
        <div class="row-fluid">
          <div class="section span12">
            <h3 class="headline">Keys</h3>
            <table class="table table-condensed" data-ng-show="state.loading || keys.length > 0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Edit</th>
                  <th>Revoke</th>
                </tr>
              </thead>
              <tbody>
                <tr data-ng-repeat="key in keys | orderBy:'label' | orderBy:'psaStatus':reverse">
                  <!-- Name -->
                  <td>
                    <a href="{{key.id}}">{{key.label}}</a>
                  </td>
                  <!-- Status -->
                  <td>
                    <span data-ng-show="key.psaStatus == 'disabled'">Revoked</span>
                    <span data-ng-show="key.psaStatus == 'active'">Active</span>
                  </td>
                  <!-- Edit -->
                  <td class="action">
                    <button class="btn" title="Edit" data-ng-click="editKey(key)"><i class="icon-pencil"></i></button>
                  </td>
                  <!-- Revoke -->
                  <td class="action">
                    <button class="btn btn-danger" title="Revoke" data-ng-hide="key.psaStatus == 'disabled'" data-ng-click="revokeKey(key)"><i class="icon-remove icon-white"></i></button>
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
            <div data-ng-show="!state.loading && keys.length == 0">
              <p class="center">You have no keys associated with this identity.
              Access keys can be added by using an external payswarm-enabled
              website or application.</p>
            </div>
          </div>
        </div>
        <!-- Revoking key alert -->
        <div data-modal-alert="modals.showRevokeKeyAlert"
          data-modal-header="Warning"
          data-modal-ok="Revoke"
          data-modal-cancel="Cancel"
          data-modal-on-close="confirmRevokeKey(err, result)">
          <div class="center alert">
            <strong>Warning!</strong>
            Revoking an access key is permanent.
          </div>
          <p>Any items that you have listed for sale using this key will be
          invalidated and any applications that use this key will be disabled.
          You can relist your items or re-enable your applications by
          registering a new key.</p>
          <p>Are you sure that you want to revoke this key?</p>
        </div>
        <div data-modal-edit-key="modals.showEditKey"
          data-key="modals.key"></div>
        </div>
      </div>
      <!-- End Keys Tab -->

    </div>
  </div>

</div>
{{/verbatim}}

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
