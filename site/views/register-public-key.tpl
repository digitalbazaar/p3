${set([
  pageTitle = registrationType + " Registration",
  jsList.push("common/scripts/register"),
  jsList.push("common/scripts/modals.add-account"),
  pageLayout = "minimal"
])}
<script type="text/javascript">
var registrationType = '${registrationType}';
</script>

{{partial "site/head.tpl"}}

{{if registrationCallback}}
<div id="registration-callback" data-callback="${registrationCallback}"></div>
{{/if}}
{{if responseNonce}}
<div id="response-nonce" data-nonce="${responseNonce}"></div>
{{/if}}

<h1 class="headline">${registrationType} Registration</h1>

<div class="row">
  <div class="span6 offset3">
{{if registrationType == "Vendor"}}
<p>
This page registers a key that your vendor software will use to make trusted
requests from this website.
</p>
{{else}}
<p>
This page registers a key that your software will use to make trusted
requests from this website.
</p>
{{/if}}
  </div>
</div>

<div class="row">
  <div class="span6 offset3">
    
    <form id="prefs-update" class="form-horizontal" 
      method="post" action="${session.identity.id}/preferences">
    
      <fieldset>
        <div class="control-group">
          <label class="control-label identity-selector hide" for="identity-selector">Identity</label>
          <div class="controls identity-selector hide">
            <div id="identity-selector"></div>
          </div>
          
          <label class="control-label account-selector hide" for="account-selector">Financial Account</label>
          <div class="controls account-selector hide">
            <div id="account-selector"></div>
          </div>
    
          <label class="control-label" for="access-key-label">Access Key Label</label>
          <div class="controls">
            <input id="access-key-label" class="form-field-vspaced form-field-constrained" name="sec:publicKey.rdfs:label" type="text" value="${publicKeyLabel}" />
          </div>
    
          <label class="control-label" for="public-key-pem">Access Key</label>
          <div class="controls">
            <textarea id="public-key-pem" class="form-field-vspaced form-field-constrained small-text" name="sec:publicKey.sec:publicKeyPem" rows="7">{{if publicKey}}${publicKey}{{/if}}</textarea>
          </div>

          <div class="form-actions">
            <button id="register" class="btn btn-large btn-primary" type="submit" disabled="disabled">Register</button>
          </div>

        </div>
          
       </fieldset>
       
    </form>
    
    <div id="register-feedback"></div>
  </div>
</div>

{{verbatim}}
<script id="preferences" type="text/x-jquery-tmpl">
<div id="register-feedback">
   <div class="message success">
   The access key has been registered.

   {{if encryptedMessage}}
   {{if registrationCallback}}
   <form id="vendor" class="standard auto-submit"
      method="post" action="${registrationCallback}">
      <input name="encrypted-message" value="${encryptedMessage}" type="hidden"/>
      <p>
        Redirecting to your ecommerce to complete registration.
        If this does not redirect automatically, please click the following button.
      </p>
      <p><button type="submit">Complete Vendor Registration</button></p>
   </form>
   {{else}}
   <p>Cut and paste the following data into your software to finish
   the setup process:</p>
   <input type="text" value="${encryptedMessage}" />
   {{/if}}
   {{/if}}
   </div>
</div>
</script>
{{/verbatim}}

<div id="register-feedback"></div>

{{partial "site/foot.tpl"}}
