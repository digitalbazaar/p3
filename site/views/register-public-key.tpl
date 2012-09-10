${set([
  pageTitle = "Access Key Registration",
  jsList.push("modules/register"),
  pageLayout = "minimal"
])}

{{partial "head.tpl"}}

{{verbatim}}
<div data-ng-controller="RegisterCtrl" class="ng-cloak">

<h1 class="headline">Access Key Registration</h1>

<div class="row">
  <div class="span6 offset3">
    <p>
    This page registers an access key that your software will use to 
    make trusted requests from this website. You may limit the power of this
    access key and only grant the software that is using the key certain rights 
    to access and modify your account.
    </p>
  </div>
</div>

<div class="row">
  <div class="span6 offset3">
    
    <form data-ng-hide="registered" class="form-horizontal" action="">
      <fieldset>
        <div class="control-group">
            <label class="control-label">Purpose</label>
            <div class="controls">
            <label>
              <input type="radio" name="registration-type"
                value="vendor" data-ng-model="registrationType"
                data-ng-change="filterIdentities()" />
              Only for listing things for sale (Vendor only)
            </label>
            <label>
              <input type="radio" name="registration-type"
                value="buyer" data-ng-model="registrationType"
                data-ng-change="filterIdentities()" />
              Buying things and listings things for sale (Vendor/Buyer)
            </label>
            </div>
        </div>
        
        <div class="control-group">
          <label class="control-label" for="identity-selector">Identity</label>
          <div class="controls">
            <div id="identity-selector" data-identity-selector
              data-identity-types="identityTypes"
              data-identities="identities"
              data-selected="selection.identity"></div>
          </div>
          
          <label class="control-label" for="account-selector">Financial Account</label>
          <div class="controls">
            <div id="account-selector" data-account-selector
              data-selected="selection.account"
              data-identity="selection.identity"></div>
          </div>
    
          <label class="control-label" for="access-key-label">Access Key Label</label>
          <div class="controls">
            <input id="access-key-label" class="form-field-vspaced form-field-constrained"
              data-ng-model="publicKey.label"
              name="publicKeyLabel" type="text" value="{{publicKey.label}}" />
          </div>
    
          <label class="control-label" for="public-key-pem">Access Key</label>
          <div class="controls">
            <textarea id="public-key-pem" class="form-field-vspaced form-field-constrained small-text"
              data-ng-model="publicKey.publicKeyPem"
              name="publicKeyPem" rows="7">{{/verbatim}}{{if publicKeyPem}}${publicKeyPem}{{/if}}{{verbatim}}</textarea>
          </div>

          <div class="form-actions">
            <button class="btn btn-large btn-primary"
              data-ng-disabled="loading"
              data-ng-click="register()">Register</button>
            <div data-spinner="loading" class="prepend-btn-large-spinner"></div>
          </div>
        </div>
       </fieldset>
    </form>
    
    <div data-ng-show="registered">
      <p>The access key has been registered.</p>
    
      <form data-ng-show="registrationCallback" id="vendor-form"
        class="form-vertical" method="post" action="{{registrationCallback}}">
        <input name="encrypted-message" value="{{encryptedMessage}}"
          type="hidden" />
        <p>
        Redirecting to your ecommerce website to complete registration. If
        this does not redirect automatically, please click the following
        button.
        </p>
        <button class="btn btn-large btn-primary"
          type="submit">Complete Vendor Registration</button>
      </form>
      
      <div data-ng-hide="registrationCallback">
        <p>
        Cut and paste the following data into your software to finish
        the registration process:
        </p>
        <input type="text" value="{{encryptedMessage}}" />
      </div>
    </div>
    
  </div>
</div>

</div>

{{/verbatim}}

{{partial "foot.tpl"}}
