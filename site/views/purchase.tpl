${set([
  pageTitle = "Payment",
  jsList.push("modules/purchase"),
  pageLayout = "minimal"
])}
{{partial "head.tpl"}}

{{verbatim}}
<div class="container" data-ng-controller="PurchaseCtrl" class="ng-cloak">

<div data-ng-hide="error">

  <div data-ng-show="loading" class="row">
    <div class="span6 offset3">
      <div class="alert alert-info">Loading purchase details...
        <div data-spinner="loading" data-spinner-class="alert-spinner"></div>
      </div>
    </div>
  </div>

  <div data-ng-hide="loading || purchased" class="row">
    <h4 class="span6 offset3">Do you want to buy this?</h4>
  </div>
    
  <div data-ng-show="purchased" class="row">
    <div class="span6 offset3">
      <div class="alert alert-success">
        <span data-ng-hide="duplicate">Congratulations! Your purchase is complete.</span>
        <span data-ng-show="duplicate">Our records indicate that you have
        already bought the item below. You have not been charged."</span>
      </div>
    </div>
  </div>
  
  <div data-ng-hide="loading" class="row">
    <div class="span6 offset3">
      <table class="table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="money">Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="{{contract.asset.assetContent}}">{{contract.asset.title}}</a></td>
            <td class="money"><span class="money"
              data-tooltip-title="Since we support micro-payments, we track transaction amounts very accurately. The exact amount of this transaction is USD {{contract.amount}}."
              data-placement="bottom" data-trigger="hover"><span
              class="currency">USD</span> {{contract.amount | ceil | currency:'$'}}</span></td>
            <td><button class="btn" data-ng-click="showDetails=!showDetails"><i class="icon-info-sign" title="Details"></i> Details</button></td>
          </tr>
        </tbody>
        <tbody data-ng-show="showDetails">
          <tr>
            <th>Cost breakdown</th>
            <th></th>
            <th></th>
          </tr>
          <tr data-ng-repeat="transfer in contract.transfer">
            <td>{{transfer.comment}}</td>
            <td class="money"><span class="money right"
              data-tooltip-title="Since we support micro-payments, we track transaction amounts very accurately. The exact amount of this transfer is USD {{transfer.amount}}."
              data-placement="bottom" data-trigger="hover"><span
              class="currency">USD</span> {{transfer.amount | ceil | currency:'$'}}</span></td>
            <td><a href="{{transfer.destination}}">Destination</a></td>
          </tr>
        </tbody>
      </table>
      
      <div>
        <p>Sold by: <a href="{{contract.assetProvider.homepage}}">{{contract.assetProvider.label}}</a> - 
        <span>{{contract.assetProvider.description}}</span></p>
      </div>
    </div>

    <div data-ng-hide="purchased" class="row">
      <div class="span6 offset3">
        <h6>Payment</h6>
      </div>
    </div>

    <div data-ng-hide="purchased" class="row">
      <div class="span6 offset3">
        <form class="well" action="">
          <fieldset>
            <div class="control-group">
              <div class="controls">
                <label class="radio inline">
                  <input type="radio" name="source-type"
                    data-ng-model="sourceType" value="account" />
                  Make one-time payment
                </label>
                <label class="radio inline">
                  <input type="radio" name="source-type"
                    data-ng-model="sourceType" value="budget" />
                  Set up a budget
                </label>
                <p class="help-block">
                  <strong>Note:</strong>
                  You can either make this a one-time payment or you can set up a
                  budget for this vendor. Assigning a budget to this vendor will
                  automatically purchase the items you select from the vendor as
                  long as you stay within a certain spending limit.
                </p>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
    
    <div data-ng-hide="purchased" class="row">
      <div class="span6 offset3">
        <h6>Source of Funds</h6>
        <div data-ng-show="sourceType == 'account'">
          <div data-account-selector
            data-selected="selection.account"
            data-show-deposit-button="true"
            data-min-balance="{{contract.amount}}"></div>
        </div>
        <div data-ng-show="sourceType == 'budget'">
          <div data-budget-selector
            data-selected="selection.budget"
            data-min-balance="{{contract.amount}}"></div>
        </div>
      </div>
    </div>
    
    <div data-ng-hide="purchased" class="row">
      <div class="span6 offset3">
        <hr />
        <div class="well center">
          <button class="btn btn-primary" data-ng-click="purchase()">Purchase</button>
          <!-- button class="btn">Cancel</button -->
        </div>
      </div>
    </div>
    
    <div data-ng-show="purchased" class="row">
      <div data-ng-show="callback" class="span6 offset3">
        <div class="alert alert-success">
          Click the button below to return to the vendor's website and view
          the item you purchased.
        </div>
        <form method="post" action="{{callback}}">
          <fieldset>
            <input
              name="encrypted-message" value="{{encryptedMessage | json}}"
              type="hidden" />
          </fieldset>
          <div class="well center">
            <button class="btn btn-primary">Return to Vendor's Website</button>
          </div>
        </form>
      </div>
      <div data-ng-hide="callback" class="span6 offset3">
        <div class="alert alert-success">
          Return to the vendor's website to view the item you purchased.
        </div>
      </div>
    </div>
    
  </div>
  
</div>

<!-- div ends non-error case -->
</div>

<div data-ng-show="error" class="alert alert-error">
  <em>Error</em>
  <br/>
  {{error.message}}
  <div data-ng-show="error.details" class="container">
    <br/>
    <em>Error Details</em>
    <div class="row" data-ng-repeat="(key, detail) in error.details">
      <span class="span12"><strong>{{key}}</strong>: {{detail}}</span>
    </div>
  </div>
</div>

</div>

<!-- div ends in footer -->
<div>

{{/verbatim}}
{{partial "foot.tpl"}}
