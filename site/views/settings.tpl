${set([
  pageTitle = "Identity Settings",
  jsList.push("modules/settings"),
  jsList.push("legacy/modals.add-address"),
  jsList.push("legacy/modals.add-payment-token"),
  jsList.push("legacy/tmpl.funcs.countries"),
  inav = "settings"
])}

{{partial "head.tpl"}}

{{verbatim}}
<div class="container ng-cloak" data-ng-controller="SettingsCtrl">

  <div class="row">
    <div class="title-section span12">
      <h1 class="headline">Settings <span class="subheadline">Configure your stuff</span></h1>
      <hr />
    </div>
  </div>
  
  <div class="tabbable tabs-left stretch-tabs">
    <ul class="nav nav-tabs">
      <li class="active"><a href="#external-accounts" data-toggle="tab">External Accounts</a></li>
      <li><a href="#addresses" data-toggle="tab">Addresses</a></li>
    </ul>
    <div class="tab-content">
      <!-- External Accounts Tab -->
      <div class="container-fluid tab-pane active"
        id="external-accounts"
        data-ng-controller="ExternalAccountsCtrl">
        <div class="row-fluid">
          <div class="section span12">
            <h3 class="headline">Credit Cards</h3>
            <table class="table table-condensed" data-ng-show="loading || creditCards.length > 0">
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
                <tr data-ng-repeat="card in creditCards | orderBy:'label'">
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
                    <button class="btn btn-danger" title="Delete" data-ng-click="deleteCard(card)"><i class="icon-remove icon-white"></i></button>
                  </td>
                </tr>
              </tbody>
              <tfoot data-ng-show="loading">
                <tr>
                  <td colspan="5" style="text-align: center">
                    <span class="center">
                      <span data-spinner="loading" data-spinner-class="table-spinner"></span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div data-ng-show="!loading && creditCards.length == 0">
              <p class="center">You have no credit cards associated with this identity.</p>
            </div>
          </div>
        </div>

        <div class="row-fluid">
          <div class="span12">
            <div data-modal-add-payment-token="showAddTokenModal"
              data-modal-on-close="tokenAdded(err, result)"></div>
            <button id="button-add-credit-card" class="btn btn-success"
              data-ng-hide="loading"
              data-ng-click="showAddTokenModal=true"><i class="icon-plus icon-white"></i> Add Credit Card</button>
          </div>
        </div>
        
        <!-- Separator -->
        <div class="row-fluid">
          <div class="span12"></div>
        </div>
        
        <div class="row-fluid">
          <div class="section span12">
            <h3 class="headline">Bank Accounts</h3>
            <table class="table table-condensed" data-ng-show="loading || bankAccounts.length > 0">
              <thead>
                <tr>
                  <th class="name">Name</th>
                  <th class="name">Number</th>
                  <th class="name">Routing</th>
                  <th>Status</th>
                  <th class="action">Delete</th>
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
                    <span><a href="#">Verify</a></span>
                  </td>
                  <!-- Delete -->
                  <td class="action">
                    <button class="btn btn-danger" title="Delete" data-ng-click="deleteBankAccount(card)"><i class="icon-remove icon-white"></i></button>
                  </td>
                </tr>
              </tbody>
              <tfoot data-ng-show="loading">
                <tr>
                  <td colspan="5" style="text-align: center">
                    <span class="center">
                      <span data-spinner="loading" data-spinner-class="table-spinner"></span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div data-ng-show="!loading && bankAccounts.length == 0">
              <p class="center">You have no bank accounts associated with this identity.</p>
            </div>
          </div>
        </div>
        
        <div class="row-fluid">
          <div class="span12">
            <button id="button-add-bank-account"
              data-ng-hide="loading" class="btn btn-success"
              data-ng-click="addToken()"><i class="icon-plus icon-white"></i> Add Bank Account</button>
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
            <table class="table table-condensed" data-ng-show="loading || addresses.length > 0">
              <thead>
                <tr>
                  <th class="name">Name</th>
                  <th class="address">Address</th>
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
              <tfoot data-ng-show="loading">
                <tr>
                  <td colspan="5" style="text-align: center">
                    <span class="center">
                      <span data-spinner="loading" data-spinner-class="table-spinner"></span>
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div data-ng-show="!loading && addresses.length == 0">
              <p class="center">You have no addresses associated with this identity.</p>
            </div>
            <div data-modal-add-address="showAddAddressModal"></div>
            <button class="btn btn-success"
              data-ng-click="showAddAddressModal=true"><i class="icon-plus icon-white"></i> Add Address</button>
          </div>
        </div>
      </div>
      <!-- End Addresses Tab -->
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
