${set([
  pageTitle = "Identity Settings",
  jsList.push("modules/settings"),
  inav = "settings"
])}

{{partial "head.tpl"}}

{{verbatim}}
<div class="container ng-cloak" data-ng-controller="SettingsCtrl">

  <div class="row">
    <div class="title-section span12">
      <h1 class="headline">Settings</h1>
      <hr />
    </div>
  </div>
  
  <div class="tabbable tabs-left">
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
                  <th class="action">Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr data-ng-repeat="card in creditCards | orderBy:'label'"
                  data-fadeout="card.deleted"
                  data-fadeout-callback="deletePaymentToken(card)">
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
                    <span>{{card.cardExpMonth}} / {{card.cardExpYear}}</span>
                  </td>
                  <!-- Delete -->
                  <td class="action">
                    <button class="btn btn-danger" title="Delete"
                      data-ng-click="card.deleted=true"><i class="icon-remove icon-white"></i></button>
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
            <div data-ng-show="!state.loading && creditCards.length == 0">
              <p class="center">You have no credit cards associated with this identity.</p>
            </div>
          </div>
        </div>

        <div class="row-fluid">
          <div class="span12">
            <div data-modal-add-payment-token="showAddCreditCardModal" data-payment-methods="creditCardMethods"></div>
            <button class="btn btn-success"
              data-ng-hide="state.loading"
              data-ng-click="showAddCreditCardModal=true"><i class="icon-plus icon-white"></i> Add Credit Card</button>
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
                  <th class="action">Delete</th>
                  <th class="action">Restore</th>
                </tr>
              </thead>
              <tbody>
                <tr data-ng-repeat="bankAccount in bankAccounts | orderBy:'label'">
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
                  <td>
                    <a data-ng-show="bankAccount.psaStatus == 'active' && !bankAccount.psaVerified && bankAccount.psaVerifyReady"
                      href="#"
                      data-ng-click="showVerifyBankAccountModal=true">Verify</a>
                    <span data-ng-show="bankAccount.psaStatus != 'active' && !bankAccount.psaVerified">Unverified</span>
                    <span data-ng-show="bankAccount.psaStatus == 'active' && !bankAccount.psaVerified && !bankAccount.psaVerifyReady">Pending</span>
                    <span data-ng-show="bankAccount.psaVerified">Verified</span>
                    <span
                      data-modal-verify-bank-account="showVerifyBankAccountModal"
                      data-token="bankAccount"></span>
                  </td>
                  <!-- Delete -->
                  <td data-ng-class="bankAccount.psaStatus == 'active' && 'action'">
                    <button data-ng-show="bankAccount.psaStatus == 'active'"
                      class="btn btn-danger" title="Delete"
                      data-ng-disabled="!bankAccount.psaVerified"
                      data-ng-click="deletePaymentToken(bankAccount)"><i class="icon-trash icon-white"></i></button>
                    <span data-ng-show="bankAccount.psaStatus == 'deleted'"
                      data-tooltip-title="Because verifying a bank account is a costly process, we do not delete bank accounts immediately. You may restore the bank account before the expiration date passes if you wish."
                      data-placement="bottom" data-trigger="hover">Expires {{bankAccount.psaExpires | date:'MMM d'}}</span>
                  </td>
                  <!-- Restore -->
                  <td class="action">
                    <button data-ng-show="!bankAccount.psaStatus || bankAccount.psaStatus == 'deleted'"
                      class="btn btn-success" title="Restore"
                      data-ng-click="restorePaymentToken(bankAccount)"><i class="icon-share icon-white"></i></button>
                  </td>
                </tr>
              </tbody>
              <tfoot data-ng-show="state.loading">
                <tr>
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
            </div>
          </div>
        </div>
        
        <div class="row-fluid">
          <div class="span12">
            <div data-modal-add-payment-token="showAddBankAccountModal" data-payment-methods="bankAccountMethods"></div>
            <button class="btn btn-success"
              data-ng-hide="state.loading"
              data-ng-click="showAddBankAccountModal=true"><i class="icon-plus icon-white"></i> Add Bank Account</button>
          </div>
        </div>
      </div>
      <!-- End External Accounts Tab -->
      
      <!-- Addresses Tab -->
      <div class="container-fluid tab-pane"
        id="addresses"
        data-ng-controller="AddressCtrl">
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
            <div data-ng-show="!state.loading && addresses.length == 0">
              <p class="center">You have no addresses associated with this identity.</p>
            </div>
          </div>
        </div>
        <div class="row-fluid">
          <div class="span12">
            <div data-modal-add-address="showAddAddressModal"></div>
            <button class="btn btn-success"
              data-ng-click="showAddAddressModal=true"><i class="icon-plus icon-white"></i> Add Address</button>
          </div>
        </div>
      </div>
      <!-- End Addresses Tab -->

      <!-- Keys Tab -->
      <div class="container-fluid tab-pane"
        id="keys"
        data-ng-controller="KeyCtrl">
        <div class="row-fluid">
          <div class="section span12">
            <h3 class="headline">Keys</h3>
            <table class="table table-condensed" data-ng-show="state.loading || keys.length > 0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th class="action">Revoke</th>
                </tr>
              </thead>
              <tbody>
                <tr data-ng-repeat="key in keys | orderBy:'label' | orderBy:'psaStatus':reverse">
                  <!-- Name -->
                  <td>
                    <a href="{{key.id}}">{{key.label}}</a></span>
                  </td>
                  <!-- Status -->
                  <td>
                    <span data-ng-show="key.psaStatus == 'disabled'">Revoked</span>
                    <span data-ng-show="key.psaStatus == 'active'">Active</span>
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
              <p class="center">You have no keys associated with this identity.</p>
            </div>
          </div>
        </div>
      </div>
      <!-- End Keys Tab -->

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
