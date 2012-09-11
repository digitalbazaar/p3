${set([
  pageTitle = "Sign In",
  jsList.push("modules/login"),
  pageLayout = "minimal"
])}
{{partial "head.tpl"}}

{{verbatim}}
<div data-ng-controller="LoginCtrl">

<h2 class="headline">Sign in to PaySwarm</h2>

<form method="post" action="" data-ng-submit="submit()">
  <fieldset>
    <div data-ng-hide="multiple" class="row headline">
      <div class="span12">
        <input name="profile" type="text" autofocus="autofocus"
          data-ng-model="profile"
          placeholder="E-mail" data-ng-disabled="loading" />
      </div>
    </div>
    
    <div data-ng-show="multiple">
      <div class="row">
        <p class="span12 alert alert-info">
          <strong>Note:</strong>
          Your email address ({{email}}) is associated with multiple
          profiles. Please select the identity associated with the profile
          you'd like to sign in with.
        </p>
      </div>
      <div class="row headline">
        <div class="span12">
          <select name="profile" autofocus="autofocus"
            data-ng-model="profile"
            data-ng-options="value.id as value.label for value in choices"
            data-ng-disabled="loading">
          </select>
        </div>
      </div>
    </div>
    
    <input type="hidden" name="ref" value="{{ref}}"/>
    
    <div class="row headline">
      <div class="span12">
        <input name="password" type="password" placeholder="Password"
          data-ng-model="password" data-ng-disabled="loading" />
      </div>
    </div>
    
    <div data-ng-show="loading" class="row headline">
      <div class="span12" data-spinner="loading"
        data-spinner-class="center-spinner"></div>
    </div>
    
    <div data-ng-hide="loading" class="row headline">
      <div class="span12">
        <div class="btn-group inline-block">
          <button class="btn btn-primary" data-submit-form
            data-ng-disabled="loading">Sign In</button>
          <button class="btn btn-primary dropdown-toggle" data-toggle="dropdown"
            data-ng-disabled="loading">
            <span class="caret"></span>
          </button>
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
    
    <div data-ng-show="error" class="row headline">
      <div class="span12">
        <hr />
        <div class="alert alert-error">{{error}}</div>
      </div>
    </div>
  </fieldset>
</form>

</div>
{{/verbatim}}

{{partial "foot.tpl"}}
