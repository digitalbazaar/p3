${set([
  pageTitle = "Budget",
  jsList.push("common/scripts/budgets"),
  jsList.push("common/scripts/website.transmitter"),
  jsList.push("common/scripts/website.management")
])}
{{partial "site/head.tpl"}}

{{! set(inav = "budgets")}}
{{! partial "identity/identity-nav.tpl"}}

<h2>Edit Budget - <span data-tx-from="label">${budget.label}</span></h2>

<form id="budget" class="form-horizontal" method="post" action="${budget.id}">
  <fieldset>
    <legend>Budget Details</legend>

    <div class="control-group">
      <label class="control-label" for="id">ID</label>
      <div class="controls">
        <input class="input-xlarge" type="text" value="${budget.id}" readonly="readonly"/>
      </div>
    </div>

    <div class="control-group" data-binding="label">
      <label class="control-label" for="label">Label</label>
      <div class="controls">
        <input class="input-xlarge tx" name="label" data-tx="label" type="text" value="${budget.label}" />
      </div>
    </div>

    <div class="control-group">
      <label class="control-label" for="account">Account</label>
      <div class="controls">
        <select class="input-xlarge" name="account" data-binding="account">
          <option value="FIXME">FIXME: use account selector</option>
          <!--
          {{! each(idx,account) identity.accounts}}
          <option value="{account.id}" {:if account.disabled}disabled="disabled"{:end}> -->
          {{! ${identity.label} - ${account.label} ${account.currency} $${account.balance} }}
          </option>
          {{! /each}}
          -->
        </select>
      </div>
    </div>

    <div class="control-group" data-binding="amount">
      <label class="control-label" for="amount">Amount</label>
      <div class="controls">
        <input class="input-xlarge tx" name="amount" type="text" value="${budget.amount}" />
        <p class="help-block">The maximum amount that can be used before the budget is refilled.</p>
      </div>
    </div>

    <div class="control-group" data-binding="amount">
      <label class="control-label" for="psaMaxPerUse">Max Per Use</label>
      <div class="controls">
        <input class="input-xlarge tx" name="psaMaxPerUse" type="text" value="{budget.psaMaxPerUse}" />
        <p class="help-block">The maximum amount that can be used per transaction using this budget.</p>
      </div>
    </div>

    <div class="control-group" data-binding="psaRefresh">
      <label class="control-label" for="psaRefresh">Refresh</label>
      <div class="controls">
        <select name="psaPefresh">
          <option value="psa:Hourly" {{if budget.psaRefresh == "psa:Hourly"}selected="selected"{{/if}>Hourly</option>
          <option value="psa:Daily" {{if budget.psaRefresh == "psa:Daily"}selected="selected"{{/if}>Daily</option>
          <option value="psa:Monthly" {{if budget.psaRefresh == "psa:Monthly"}selected="selected"{{/if}>Monthly</option>
          <option value="psa:Yearly" {{if budget.psaRefresh == "psa:Yearly"}selected="selected"{{/if}>Yearly</option>
        </select>
        <p class="help-block">The interval between refilling the budget balance to the maximum amount.</p>
      </div>
    </div>

    <div class="control-group" data-binding="psaRefresh">
      <label class="control-label" for="psaExpires">Expiration</label>
      <div class="controls">
        <select name="psaExpires">
          <option value="" selected="selected">Current</option>
          <option value="2629800">1 month</option>
          <option value="7889400">3 months</option>
          <option value="15778800">6 months</option>
          <option value="31557600">1 year</option>
        </select>
        <p class="help-block">The interval between refilling the budget balance to the maximum amount.</p>
      </div>
    </div>
  </fieldset>

  <div class="form-actions">
    <button class="btn btn-primary" type="submit"><i class="icon-ok icon-white"></i> Save Changes</button>
    <a class="btn" href="${budget.owner}/dashboard">Cancel</a>
  </div>

  <div id="budget-feedback" class="feedback"></div>
</form>

{{verbatim}}
<script id="budget-feedback-tmpl" type="text/x-jquery-tmpl">
  <div id="budget-feedback" class="feedback">
    {{if success}}
    <p class="alert alert-success">The account was updated successfully.</p>
    {{else}}
    <p class="alert alert-error">The account was not updated due to an error. Please try again.</p>
    {{/if}}
  </div>
</script>
{{/verbatim}}

<div class="form dropdown">
<form id="budget-add-vendor" class="ajax standard"
   method="post" action="">
   <h2>Edit Budget Vendors - <span data-tx-from="label">${budget.label}</span></h2>
   
   <p class="clearfix">
      <label class="block-inline w15 mr1">Vendors
      {{if budget.vendor.length == 0}}
      <div>
         <p class="center">This budget is not used for any vendors.</p>
      </div>
      {{else}}
      {{each(idx,vendor) budget.vendor}}
      <div class="resource vendor clearfix" about="?vendor=${vendor}">
         <p class="block-inline w62 mr1">
            <a href="${vendor}">${vendor}</a>
         </p>
   
         <p class="block-inline w6 comment">
            <a class="resource-delete" href="#">Delete</a>
         </p>
      </div>
      {{/each}}
      {{/if}}
   </p>
   
   <p class="clearfix">
      <label class="block-inline w31 mr1">Add Vendor
         <input id="vendor" class="tx" data-tx="vendor" name="com:vendor" type="text" value="" />
      </label>
   </p>

   <p class="clear">
      <button type="submit">Add Vendor</button>
   </p>

   <div id="budget-add-vendor-feedback"></div>
</form>
</div>

{{partial "site/foot.tpl"}}
