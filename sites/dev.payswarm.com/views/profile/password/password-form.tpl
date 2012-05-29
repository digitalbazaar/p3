<form id="password" class="ajax standard"
   method="post" action="/profile/password">
   <h3>Password</h3>

   <input name="@id" type="hidden" value="${profile["@id"]}" />

   <p class="clearfix">
      <label class="block-inline w29 mr1">New Password
         <input name="psa:passwordNew" type="password" maxlength="32" />
      </label>

      <label class="block-inline w30">Current Password
         <input name="psa:password" type="password" maxlength="32" />
      </label>
   </p>

   <p class="clearfix">
      <span class="block-inline w29 mr1">
      <button class="default" type="submit" title="Set Password">
         Set Password
      </button>
      </span>

      <span class="block-inline w30 comment">
         <a href="/profile/passcode">Forgot your password?</a>
      </span>
   </p>

   <div id="password-feedback">
      {{if message}}<p class="message ${type}>${message}</p>{{/if}}
   </div>
</form>
