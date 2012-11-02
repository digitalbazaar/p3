${set([
  pageTitle = "Create a Profile",
  jsList.push("modules/createProfile")
])}
{{partial "head.tpl"}}

{{verbatim}}
<div class="row ng-cloak" data-ng-controller="CreateProfileCtrl">
  <div class="span8 offset2">
    <h2>Create a Profile</h2>
    
    <p>
    You are well on your way to empowering yourself and others with PaySwarm. By
    creating a profile, you will be able to raise money for projects, fund other
    projects, buy and sell digital goods online and enter a new world of 
    collaborating with your friends to make the world a better place... or just
    split the cost of a pizza. What you do with your new super power is up to you. 
    </p>
    
    <div data-ng-include="'/partials/demo-warning.html'"></div>
    
    <hr />
    
    <form class="form-horizontal" action="" data-ng-submit="submit()">
      <fieldset>
        <legend>Your Profile Details</legend>
        
        <div class="control-group" data-binding="email">
          <label class="control-label" for="email">Email</label>
          <div class="controls">
            <input class="input-xlarge form-field-vspaced"
              name="email" data-binding="email" type="text"
              data-ng-model="data.email"
              data-focus-toggle="model.help.email"
              data-ng-disabled="loading" />
            <p data-fade-toggle="model.help.email" class="help-block">
              A valid email address is required so that we can send you
              receipts and reset your password if you get locked out.
            </p>
          </div>
        </div>
    
        <div class="control-group" data-binding="psaPassword">
          <label class="control-label" for="password">Password</label>
          <div class="controls">
            <input class="input-xlarge"
              name="password" data-binding="psaPassword" 
              maxlength="32" type="password"
              data-ng-model="data.psaPassword"
              data-focus-toggle="model.help.password"
              data-ng-disabled="loading" />
            <p data-fade-toggle="model.help.password" class="help-block">
              Please enter a secure password, the best passwords are
              memorable long phrases like: the<strong>lemurs</strong>ride<strong>on</strong>the<strong>fortnight</strong>
            </p>
          </div>
        </div>
      </fieldset>
    
      <fieldset>
        <legend>Your Identity</legend>
    
        <div class="control-group">
          <p class="help-block">
    Your identity will be used to identify you online. It is usually a good idea 
    to use some shortened form of your full name here, similar to how people choose
    email addresses or twitter handles. Keep in mind that you can always create a
    new identity, which could be semi-anonymous or fully-anonymous, later on. This
    would allow you to buy and/or fund things while protecting your privacy.
          </p>
        </div>
    
        <div class="control-group" data-binding="psaIdentity.label">
          <label class="control-label" for="identity">Identity Name</label>
          <div class="controls">
            <input class="input-xlarge" 
              name="identity-label" type="text"
              data-slug-out="data.psaIdentity.psaSlug"
              data-ng-model="data.psaIdentity.label"
              data-focus-toggle="model.help.identityLabel"
              data-ng-disabled="loading" />
            <p data-fade-toggle="model.help.identityLabel" class="help-block">
              Enter your online handle, for example, some form of your full
              name like 'janedoe'. You can also customize your identity vanity
              address below:
            </p>
            <p><small>{{baseUrl}}/i/</small><input
              data-binding="psaIdentity.psaSlug" class="slug"
              name="identity-slug" type="text" maxlength="32"
              placeholder="IDENTITY-NAME"
              value="{{data.psaIdentity.psaSlug}}"
              data-slug-in data-ng-model="data.psaIdentity.psaSlug"
              data-ng-disabled="loading" /></p>
            <div data-duplicate-checker="data.psaIdentity.psaSlug"
              data-duplicate-checker-type="ps:PersonalIdentity"
              data-duplicate-checker-available="This identity name is available!"
              data-duplicate-checker-invalid="Identity name is invalid."
              data-duplicate-checker-taken="Identity name has already been taken."
              data-duplicate-checker-checking="Checking Availability...">
            </div>
          </div>
        </div>
      </fieldset>
      
      <!-- <button class="btn" data-toggle="collapse" data-target="#account-form">
        Advanced
      </button> -->
     
      <div class="collapse">  
        <fieldset>
          <legend>Your Default Financial Account</legend>
      
          <div class="control-group">
            <p class="help-block">
      Your default financial account is where you will keep your money and have
      others send you money. You start off with one financial account, but you can 
      add others at any point at no extra cost.
            </p>
          </div>
      
          <div class="control-group" data-binding="account.label">
            <label class="control-label" for="account">Account Name</label>
            <div class="controls">
              <input class="input-xlarge" 
                name="account-label" value="Primary Account" type="text"
                data-ng-model="data.account.label"
                data-slug-out="data.account.psaSlug"
                data-focus-toggle="model.help.accountLabel"
                data-ng-disabled="loading" />
              <p data-fade-toggle="model.help.accountLabel" class="help-block">
                The name of your default financial account. Most people pick
                'Primary Account' for the name of this account. You can change
                your account's vanity address below:
              </p>
              <p><small>{{baseUrl}}/i/{{psaIdentity.psaSlug || 'IDENTITY-NAME'}}/accounts/</small><input
                data-binding="account.psaSlug" class="slug" name="account-slug"
                placeholder="ACCOUNT-NAME" value="{{data.account.psaSlug}}"
                data-slug-in data-ng-model="data.account.psaSlug"
                data-ng-disabled="loading" /></p>
            </div>
          </div>
      
        </fieldset>
      </div>
      
      <p class="comment">By joining you agree to the <a href="/legal#tos">Terms of Service</a> and <a href="/legal#pp">Privacy Policy</a>.</p>
        
      <div class="form-actions">
        <button data-ng-disabled="loading"
          class="btn btn-large btn-primary"
          data-submit-form>Create Profile</button>
        <span data-spinner="loading"
          data-spinner-class="append-btn-spinner"></span>
      </div>
    
      <div name="create-feedback" class="feedback"></div>
    </form>
  </div>
</div>
{{/verbatim}}

{{partial "foot.tpl"}}
