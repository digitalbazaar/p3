${set([
  pageTitle = "Budget",
  jsList.push("common/scripts/budgets"),
  jsList.push("common/scripts/website.transmitter"),
  jsList.push("common/scripts/website.management")
])}
{{partial "site/head.tpl"}}

{{! set(inav = "budgets")}}
{{! partial "identity/identity-nav.tpl"}}

<h2>Edit Budget - <span data-tx-from="rdfs:label">${budget.rdfs:label}</span></h2>

<form id="budget" class="form-horizontal" method="post" action="${budget["@id"]}">
  <fieldset>
    <legend>Budget Details</legend>

    <div class="control-group">
      <label class="control-label" for="@id">ID</label>
      <div class="controls">
        <input class="input-xlarge" type="text" value="${budget["@id"]}" readonly="readonly"/>
      </div>
    </div>

    <div class="control-group" data-binding="rdfs:label">
      <label class="control-label" for="rdfs:label">Label</label>
      <div class="controls">
        <input class="input-xlarge tx" name="rdfs:label" data-tx="rdfs:label" type="text" value="${budget["rdfs:label"]}" />
      </div>
    </div>

    <div class="control-group">
      <label class="control-label" for="com:account">Account</label>
      <div class="controls">
        <select class="input-xlarge" name="com:account" data-binding="com:account">
          <option value="FIXME">FIXME: use account selector</option>
          <!--
          {{! each(idx,account) identity.accounts}}
          <option value="{account.@id}" {:if account.disabled}disabled="disabled"{:end}> -->
          {{! ${identity["rdfs:label"]} - ${account["rdfs:label"]} ${account["com:currency"]} $${account["com:balance"]} }}
          </option>
          {{! /each}}
          -->
        </select>
      </div>
    </div>

    <div class="control-group" data-binding="com:amount">
      <label class="control-label" for="com:amount">Amount</label>
      <div class="controls">
        <input class="input-xlarge tx" name="com:amount" type="text" value="${budget["com:amount"]}" />
        <p class="help-block">The maximum amount that can be used before the budget is refilled.</p>
      </div>
    </div>

    <div class="control-group" data-binding="com:amount">
      <label class="control-label" for="psa:maxPerUse">Max Per Use</label>
      <div class="controls">
        <input class="input-xlarge tx" name="psa:maxPerUse" type="text" value="{budget.psa:maxPerUse}" />
        <p class="help-block">The maximum amount that can be used per transaction using this budget.</p>
      </div>
    </div>

    <div class="control-group" data-binding="psa:refresh">
      <label class="control-label" for="psa:refresh">Refresh</label>
      <div class="controls">
        <select name="psa:refresh">
          <option value="psa:Hourly" {{if budget["psa:refresh"] == "psa:Hourly"}selected="selected"{{/if}>Hourly</option>
          <option value="psa:Daily" {{if budget["psa:refresh"] == "psa:Daily"}selected="selected"{{/if}>Daily</option>
          <option value="psa:Monthly" {{if budget["psa:refresh"] == "psa:Monthly"}selected="selected"{{/if}>Monthly</option>
          <option value="psa:Yearly" {{if budget["psa:refresh"] == "psa:Yearly"}selected="selected"{{/if}>Yearly</option>
        </select>
        <p class="help-block">The interval between refilling the budget balance to the maximum amount.</p>
      </div>
    </div>

    <div class="control-group" data-binding="psa:refresh">
      <label class="control-label" for="psa:expires">Expiration</label>
      <div class="controls">
        <select name="psa:expires">
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
    <a class="btn" href="${budget["ps:owner"]}/dashboard">Cancel</a>
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
   <h2>Edit Budget Vendors - <span data-tx-from="rdfs:label">${budget["rdfs:label"]}</span></h2>
   
   <p class="clearfix">
      <label class="block-inline w15 mr1">Vendors
      {{if budget["com:vendor"].length == 0}}
      <div>
         <p class="center">This budget is not used for any vendors.</p>
      </div>
      {{else}}
      {{each(idx,vendor) budget["com:vendor"]}}
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
