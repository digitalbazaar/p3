${set([
  pageTitle = "Register Vendor",
  jsList.push("common/scripts/modals.add-account"),
  jsList.push("common/scripts/vendor"),
  pageLayout = "minimal"
])}
{{partial "site/head.tpl"}}

{{if registrationCallback}}
<div id="registration-callback" data-callback="${registrationCallback}"></div>
{{/if}}
{{if responseNonce}}
<div id="response-nonce" data-nonce="${responseNonce}"></div>
{{/if}}

<h1 class="headline">Vendor Registration</h1>
<div class="row">
  <div class="span6 offset3">
    
    <form id="vendor-update" class="form-horizontal" 
      method="post" action="${session.identity.id}/preferences">
    
      <fieldset>
        <div class="control-group">
          <label class="control-label vendor-identity-selector hide" for="vendor-identity-selector">Identity</label>
          <div class="controls vendor-identity-selector hide">
            <div id="vendor-identity-selector"></div>
          </div>
          
          <label class="control-label vendor-account-selector hide" for="vendor-account-selector">Financial Account</label>
          <div class="controls vendor-account-selector hide">
            <div id="vendor-account-selector"></div>
          </div>
    
          <label class="control-label" for="access-key-label">Access Key Label</label>
          <div class="controls">
            <input id="access-key-label" class="form-field-vspaced form-field-constrained" name="sec:publicKey.rdfs:label" type="text" value="Vendor Access Key 1" />
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
    
    <div id="vendor-register-feedback"></div>
  </div>
</div>

{{verbatim}}
<script id="vendor-preferences" type="text/x-jquery-tmpl">
<div id="vendor-register-feedback">
   <div class="message success">
   The vendor has been registered.

   {{if encryptedMessage}}
   {{if registrationCallback}}
   <form id="vendor" class="standard auto-submit"
      method="post" action="${registrationCallback}">
      <input name="encrypted-message" value="${encryptedMessage}" type="hidden"/>
      <p>
        Redirecting to your vendor to complete registration.
        If this does not redirect automatically, please click the following button.
      </p>
      <p><button type="submit">Complete Vendor Registration</button></p>
   </form>
   {{else}}
   <p>Use the following data to complete initialization of your vendor application:</p>
   <pre>
   ${encryptedMessage}
   </pre>
   {{/if}}
   {{/if}}
   </div>
</div>
</script>
{{/verbatim}}

<div id="vendor-register-feedback"></div>

{{partial "site/foot.tpl"}}
