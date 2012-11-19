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
    By creating a profile, you will be able to raise money for projects, fund
    other projects, buy and sell digital goods online and enter a new world of 
    collaborating with your friends to make the world a better place... or just
    split the cost of a pizza. What you do with your new super power is up to you. 
    </p>
    
    <div data-ng-include="'/partials/demo-warning.html'"></div>
    
    <hr />
    
    <form id="createProfileFeedbackTarget" class="form-horizontal" action="" data-ng-submit="submit()">
      <fieldset>
        <legend>Your Profile Details</legend>
        
        <div class="control-group" data-binding="email">
          <label class="control-label" for="email">Email</label>
          <div class="controls">
            <div class="input-append">
              <input class="input-xlarge form-field-vspaced"
                name="email" data-binding="email" type="text"
                data-ng-model="data.email"
                data-track-state="model.help.email"
                data-ng-disabled="loading" />
              <button class="btn" data-help-toggle="model.help.email">
                <i class="icon-question-sign"></i>
              </button>
            </div>
            <div data-duplicate-checker="data.email"
              data-duplicate-checker-type="email"
              data-duplicate-checker-available="This email address is available!"
              data-duplicate-checker-invalid="Email address is invalid."
              data-duplicate-checker-taken="This email address is already in use. While you can create a new profile if you want to, you should probably log in and create a new identity instead."
              data-duplicate-checker-checking="Checking Availability..."
              data-duplicate-checker-result="model.emailAvailable">
            </div>
            <p data-fade-toggle="model.help.email.show" class="help-block">
              A valid email address is required so that we can send you
              receipts and reset your password if you get locked out.
            </p>
          </div>
        </div>
    
        <div class="control-group" data-binding="psaPassword">
          <label class="control-label" for="password">Password</label>
          <div class="controls">
            <div class="input-append">
              <input class="input-xlarge"
                name="password" data-binding="psaPassword" 
                maxlength="32" type="password"
                data-ng-model="data.psaPassword"
                data-track-state="model.help.password"
                data-ng-disabled="loading" />
              <button class="btn" data-help-toggle="model.help.password">
                <i class="icon-question-sign"></i>
              </button>
            </div>
            <p data-fade-toggle="model.help.password.show" class="help-block">
              Please enter a secure password, the best passwords are
              long, memorable phrases like: the<strong>lemurs</strong>ride<strong>on</strong>the<strong>fortnight</strong>
            </p>
          </div>
        </div>
      </fieldset>
    
      <fieldset>
        <legend>Your Identity</legend>
    
        <div class="control-group">
          <p class="help-block">
    Your identity will be used to keep track of and verify your online
    activity with this service. It is stored along with any purchases or
    sales that you participate in. It is usually a good idea to use some
    shortened form of your full name here, similar to how people choose
    email addresses or twitter handles. Once you've logged in, you'll be
    able to create new personal or business identities, all with the
    same email address, if you want to.
          </p>
        </div>
    
        <div class="control-group" data-binding="psaIdentity.label">
          <label class="control-label" for="identity">Identity Name</label>
          <div class="controls">
            <div class="input-append">
              <input class="input-xlarge" 
                name="identity-label" type="text"
                data-slug-out="data.psaIdentity.psaSlug"
                data-ng-model="data.psaIdentity.label"
                data-track-state="model.help.identityLabel"
                data-ng-disabled="loading" />
              <button class="btn" data-help-toggle="model.help.identityLabel">
                <i class="icon-question-sign"></i>
              </button>
            </div>
            <p data-fade-toggle="model.help.identityLabel.show"
              class="help-block">
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
              data-duplicate-checker-checking="Checking Availability..."
              data-duplicate-checker-result="model.identitySlugAvailable">
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
              <div class="input-append">
                <input class="input-xlarge" 
                  name="account-label" value="Primary Account" type="text"
                  data-ng-model="data.account.label"
                  data-slug-out="data.account.psaSlug"
                  data-track-state="model.help.accountLabel"
                  data-ng-disabled="loading" />
                <button class="btn" data-help-toggle="model.help.accountLabel">
                  <i class="icon-question-sign"></i>
                </button>
              </div>
              <p data-fade-toggle="model.help.accountLabel.show"
                class="help-block">
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
        <div class="modal-feedback"
          data-feedback="feedback" data-target="feedbackTarget"></div>
        <span data-spinner="loading"
          data-spinner-class="append-btn-spinner"></span>
        <button data-ng-disabled="loading || !model.identitySlugAvailable"
          class="btn btn-large btn-primary"
          data-submit-form>Create Profile</button>
      </div>
    
      <div name="create-feedback" class="feedback"></div>
    </form>
  </div>
</div>
{{/verbatim}}

{{partial "foot.tpl"}}
