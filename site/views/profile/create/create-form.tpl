<h2>Create a Profile</h2>

<p>
You are well on your way to empowering yourself and others with PaySwarm. By
creating a profile, you will be able to raise money for projects, fund other
projects, buy and sell digital goods online and enter a new world of 
collaborating with your friends to make the world a better place... or just
split the cost of a pizza. What you do with your new super power is up to you. 
</p>

{{! mode warning }}
{{if productionMode == false}}
<div class="alert alert-info">
   <strong>NOTE:</strong> This is a demonstration website that does not use real money. Please do not enter any sensitive personal information. [<a href="http://payswarm.com/wiki/Demo_Warning">more info...</a>]
</div>
{{/if}}

<hr />

<form id="create" class="form-horizontal" method="post" action="/profile/create">
  <fieldset>
    <legend>Your Profile Details</legend>
    
    <div class="control-group" data-binding="email">
      <label class="control-label" for="email">Email</label>
      <div class="controls">
        <input id="email" class="input-xlarge auto-tooltip form-field-vspaced"
          name="email" data-binding="email" type="text"
          data-original-title="A valid e-mail address is required so that we can send you receipts and reset your password if you get locked out."
          data-placement="right" data-trigger="focus" />
      </div>
    </div>

    <div class="control-group" data-binding="label">
      <label class="control-label" for="profile">Profile Name</label>
      <div class="controls">
        <input id="profile" class="input-xlarge auto-tooltip tx" data-tx="profile" 
          name="profile-label" data-binding="label" type="text" 
          data-original-title="You can use your profile name to sign into the website. It's best to use something simple. If you would like, you can also customize your profile vanity address below."
          data-placement="right" data-trigger="focus"/>
        <p class="comment"><small><span name="authority-base">https://payswarm.com</span>/profile/</small><input data-tx-from="profile" class="slug" name="profile-slug" data-binding="psaSlug" type="text" maxlength="32" placeholder="PROFILE_NAME" /></p>
        <div id="profile-duplicate">
          <div name="available" class="alert alert-success alert-short hide">This profile is available!</div>
          <div name="invalid" class="alert alert-error alert-short hide">Profile name is invalid.</div>
          <div name="taken" class="alert alert-error alert-short hide">Profile name has already been taken.</div>
          <div name="checking" class="alert alert-warning alert-short hide">Checking availability...</div>
        </div>
      </div>
    </div>

    <div class="control-group" data-binding="psaPassword">
      <label class="control-label" for="password">Password</label>
      <div class="controls">
        <input id="password" class="input-xlarge auto-tooltip"
          name="password" data-binding="psaPassword" 
          maxlength="32" type="password"
          data-original-title="Please use a secure password, the best passwords are long phrases like: the<strong>lemurs</strong>ride<strong>on</strong>the<strong>fortnight</strong>"
          data-placement="right" data-trigger="focus"/>
      </div>
    </div>
  </fieldset>

  <fieldset>
    <legend>Your Initial Identity</legend>

    <div class="control-group">
      <p class="help-block">
Your identity will be used to identify you online. It is usually a good idea 
to use some form of your full name here, similar to how people choose email
addresses or twitter handles. Keep in mind that you can always create a new
identity, which could be semi-anonymous or fully-anonymous, later on. This
would allow you to buy and/or fund things while protecting your privacy.
      </p>
    </div>

    <div class="control-group" data-binding="psaIdentity.label">
      <label class="control-label" for="identity">Identity Name</label>
      <div class="controls">
        <input id="identity" class="input-xlarge tx auto-tooltip" data-tx="identity" 
          name="identity-label" type="text" 
          data-original-title="Enter your online handle, for example, some form of your full name like 'janedoe'. You can also customize your identity vanity address below."
          data-placement="right" data-trigger="focus"/>
        <p class="comment"><small><span name="authority-base">https://payswarm.com</span>/i/</small><input data-tx="identity-slug" data-tx-from="identity" class="tx slug" name="identity-slug" data-binding="psaIdentity.psaSlug" type="text" maxlength="32" placeholder="IDENTITY-NAME" /></p>
        <div id="identity-duplicate">
          <div name="available" class="alert alert-success alert-short hide">This identity is available!</div>
          <div name="invalid" class="alert alert-error alert-short hide">Identity name is invalid.</div>
          <div name="taken" class="alert alert-error alert-short hide">Identity name has already been taken.</div>
          <div name="checking" class="alert alert-warning alert-short hide">Checking availability...</div>
        </div>
      </div>
    </div>
  </fieldset>

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
        <input id="account" class="input-xlarge tx auto-tooltip" 
          data-tx="account" name="account-label" 
          type="text" data-original-title="The name of your default financial account. Most people pick 'Primary' for the name of this account. You can change your account's vanity address below."
          data-placement="right" data-trigger="focus" />
        <p><small><span name="authority-base">https://payswarm.com</span>/i/<span data-tx-from="identity-slug" data-tx-placeholder="IDENTITY-NAME" class="slug"></span>/accounts/</small><input data-tx-from="account" class="slug" name="account-slug" data-binding="account.psaSlug" type="text" maxlength="32" placeholder="ACCOUNT-NAME" /></p>
      </div>
    </div>

  </fieldset>
  
  <p class="comment">By joining you agree to the <a href="/legal#tos">Terms of Service</a> and <a href="/legal#pp">Privacy Policy</a>.</p>
    
  <div class="form-actions">
    <button class="btn btn-large btn-primary" type="submit">Create Profile</button>
  </div>

  <div name="create-feedback" class="feedback"></div>
</form>
