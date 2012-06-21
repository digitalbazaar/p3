<form id="login" method="post" action="/profile/login">
  <fieldset>
    {{if ref}}
    <input type="hidden" name="ref" value="${ref}"/>
    {{/if}}
    <div class="row headline">
      <div class="span12">
        <input name="profile" type="text" autofocus="autofocus"
          placeholder="E-mail or profile name" />
      </div>
    </div>
     
    <div class="row headline">
      <div class="span12">  
        <input name="password" type="password" placeholder="Password" />
      </div>
    </div>
     
    <div class="row headline">
      <div class="span12">
        <div class="btn-group inline-block">
          <a class="btn btn-primary" id="signin-button">Sign In</a>
          <a class="btn btn-primary dropdown-toggle" data-toggle="dropdown" href="#">
            <span class="caret"></span>
          </a>
          <ul class="dropdown-menu">
            <li>
              <a href="/profile/create">
                <i class="icon-user"></i>
                Create a Profile
              </a>
            </li>
            <li>
              <a href="/profile/passcode">
                <i class="icon-refresh"></i>
                Password Reset
              </a>
            </li>
          </ul>          
        </div>
      </div>
    </div>
    
    <div class="row headline">
      <div class="span12">
        <div name="login-feedback"></div>
      </div>
    </div>
  </fieldset>
</form>

{{verbatim}}

<script id="login-multiple-tmpl" type="text/x-jquery-tmpl">

<form id="login" method="post" action="/profile/login">
  <div class="row">
    <p class="span12 alert alert-info">
      <strong>Note:</strong>
      Your email address (${email}) is associated with multiple
      profiles. Please select the profile to sign in as.
    </p>
  </div>
  <div class="row headline">
    <div class="span12">
      <select name="profile" autofocus="autofocus">
      {{each(idx,profile) profiles}}
        <option value="${profile.label}"{{if idx == 0}} selected="selected"{{/if}}>${profile.label}</option>
      {{/each}}
      </select>
    </div>
  </div>
   
  <div class="row headline">
    <div class="span12">  
      <input name="password" type="password" placeholder="Password" />
    </div>
  </div>
   
  <div class="row headline">
    <div class="span12">

      <div class="btn-group btn-group-banner">
        <input class="btn" type="submit" value="Sign In" />
        <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
          <span class="caret"></span>
        </a>
        <ul class="dropdown-menu">
          <li>
            <a href="/profile/create">
              <i class="icon-user"></i>
              Create a Profile
            </a>
          </li>
          <li>
            <a href="/profile/passcode">
              <i class="icon-refresh"></i>
              Password Reset
            </a>
          </li>
        </ul>
      </div>
      <div name="login-feedback" class="alert alert-error" style="display: none;"></div>
    </div>
  </div>
</form>

</script>

{{/verbatim}}
