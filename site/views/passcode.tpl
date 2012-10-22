${set([
  pageTitle = "Reset Password",
  jsList.push("legacy/payswarm.api"),
  jsList.push("modules/passcode")
])}
{{partial "head.tpl"}}

<h2 class="headline">${pageTitle}</h2>

{{verbatim}}
<div class="ng-cloak" data-ng-controller="PasscodeCtrl">

<div class="row">
  <div class="span6 offset3">
  
    <form class="form-horizontal" action="" data-ng-submit="sendReset()">
      <fieldset>
      <legend>Get Passcode</legend>
        <div class="control-group" data-binding="psaIdentifier">
          <label class="control-label" for="email">Email</label>
          <div class="controls">
            <input name="profile" type="text" maxlength="320"
              data-ng-model="email"
              data-tooltip-title="The email address that you used when you registered with this website."
              data-placement="right" data-trigger="focus"
              data-ng-disabled="loading" />
          </div>
        </div>
      <div class="form-actions">
        <button data-ng-disabled="loading"
          class="btn btn-primary" data-submit-form>Send Reset Instructions</button>
        <span data-spinner="loading"
          data-spinner-class="append-btn-spinner"></span>
      </div>
      </fieldset>
      <div data-ng-show="feedback.email.text"
        class="alert alert-{{(feedback.email.error && 'error') || 'success'}}">{{feedback.email.text}}</div>
    </form>

  </div>
</div>

<div class="row">
  <div class="span6 offset3">
  
    <form class="form-horizontal" action="" data-ng-submit="updatePassword()">
      <fieldset>
      <legend>Update Your Password</legend>

      <div class="control-group">
        <label class="control-label" for="reset-email">Email</label>
        <div class="controls">
          <input name="input" type="text" maxlength="320"
            data-ng-model="email" 
            data-tooltip-title="The email address that you used above to retrieve reset instructions and a reset passcode."
            data-placement="right" data-trigger="focus"
            data-ng-disabled="loading" />
        </div>
      </div>
      
      <div class="control-group">
        <label class="control-label" for="passcode">Passcode</label>
        <div class="controls">
          <input name="psaPasscode" type="text" maxlength="8"
            data-ng-model="psaPasscode"
            data-original-title="The passcode that was sent to you in the password reset email from this website."
            data-placement="right" data-trigger="focus"
            data-ng-disabled="loading" />
        </div>
      </div>
      
      <div class="control-group">
        <label class="control-label" for="new-password">New Password</label>
        <div class="controls">
          <input name="psaPasswordNew" type="password" maxlength="32"
            data-ng-model= "psaPasswordNew"
            data-tooltip-title="The new password that you would like to use when accessing this website."
            data-placement="right" data-trigger="focus"
            data-ng-disabled="loading" />
        </div>
      </div>

      <div class="form-actions">
         <button data-ng-disabled="loading"
           class="btn btn-primary" data-submit-form>Set Password</button>
         <span data-spinner="loading"
           data-spinner-class="append-btn-spinner"></span>
      </div>
      </fieldset>
      <div data-ng-show="feedback.password.text"
        class="alert alert-{{(feedback.password.error && 'error') || 'success'}}">{{feedback.password.text}}</div>
    </form>

  </div>
</div>

</div>
{{/verbatim}}

{{partial "foot.tpl"}}
