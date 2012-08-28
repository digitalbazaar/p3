${set([
  pageTitle = "Payment",
  jsList.push("legacy/tmpl.funcs.countries"),
  jsList.push("legacy/pay"),
  jsList.push("legacy/modals.add-account"),
  jsList.push("legacy/modals.add-address"),
  jsList.push("legacy/modals.add-budget"),
  jsList.push("legacy/modals.add-payment-token"),
  jsList.push("legacy/modals.deposit"),
  pageLayout = "minimal",
  templateMap["quote-tmpl"] = cacheRoot + "/legacy/jqtpl/quote-tmpl.html",
  templateMap["error-tmpl"] = cacheRoot + "/legacy/jqtpl/error-tmpl.html"
])}
{{partial "head.tpl"}}
{{partial "legacy/modals/add-address.tpl"}}
{{partial "legacy/modals/add-budget.tpl"}}
{{partial "legacy/modals/add-payment-token.tpl"}}
{{partial "legacy/modals/deposit.tpl"}}

<div class="container">
  
  <div id="pay-feedback">
    <div class="alert alert-info">Loading purchase details...</div>
  </div>

  <div id="payment" class="row hide">
    <div class="row">
      <h4 class="span6 offset3">Do you want to buy this?</h4>
    </div>
    
    <div class="row">
      <div id="pay-quote" class="span6 offset3"></div>
    </div>

    <div class="row">
      <div class="span6 offset3">
        <h6>Payment</h6>
      </div>
    </div>

    <div class="row">
      <div class="span6 offset3">
        <form id="pay-form" class="well" action="">
          <fieldset>
            <div class="control-group">
              <div class="controls">
                <label class="radio inline">
                  <input type="radio" name="pay-type" value="once" checked="checked" />
                  Make one-time payment
                </label>
                <label class="radio inline">
                  <input type="radio" name="pay-type" value="budget" />
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
    
    <div class="row">
      <div class="span6 offset3">
        <h6>Source of Funds</h6>
        <div id="pay-account-selector" class="hide"></div>
        <div id="pay-budget-selector" class="hide"></div>
      </div>
    </div>
    
    <div class="row">
      <div class="span6 offset3">
        <div class="well center">
          <button class="btn btn-primary" name="button-purchase">Purchase</button>
          <!-- button class="btn" name="button-cancel-purchase">Cancel</button -->
        </div>
      </div>
    </div>
  </div>
  
</div>

<div>

{{partial "foot.tpl"}}

{{verbatim}}

<script id="purchase-complete-tmpl" type="text/x-jquery-tmpl">

<div class="row">
  <div class="span6 offset3">
    <div class="alert alert-success">
{{if !duplicate}}
      Congratulations! Your purchase is complete.
{{else}}
      Our records indicate that you have already bought the item below. You
      have not been charged.
{{/if}}
    </div>
  </div>
<div>

<div class="row">
  <div id="pay-quote" class="span6 offset3"></div>
</div>

<div class="row">
  <div class="span6 offset3">
{{if callback}}
    <div class="alert alert-success">
      Click the button below to return to the vendor's website and view
      the item you purchased.
    </div>
    <form id="vendor-form" class="hide" method="post" action="${callback}">
      <fieldset>
        <input id="encrypted-message-field" name="encrypted-message" value="${encryptedMessage}" type="hidden" />
      </fieldset>
    </form>
    <div class="well center">
      <button class="btn btn-primary" name="button-complete-purchase">Return to Vendor's Website</button>
    </div>
{{else}}
    <div class="alert alert-success">
      Return to the vendor's website to view the item you purchased.
    </div>
{{/if}}
  </div>
</div>

</script>

{{/verbatim}}
