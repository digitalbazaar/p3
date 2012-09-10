${set([
  jsList.push("legacy/website.transmitter"),
  jsList.push("legacy/website.util"),
  jsList.push("legacy/payswarm.api"),
  jsList.push("legacy/login")
])}

<div class="navbar">
  <div class="navbar-inner navbar-inner-banner">
    <div class="container">
      <a class="brand" href="/"><img
      src="${cacheRoot}${style.brand.src}"
      width="${style.brand.width}" height="${style.brand.height}"
      alt="${style.brand.alt}" /></a>      
      {{if pageLayout == "normal"}}
      <form id="login" class="navbar-form pull-right">
        <fieldset>
          <input class="input-medium" name="profile" type="text" placeholder="E-mail" />
          <input class="input-medium" name="password" type="password" placeholder="Password" />
          <div class="btn-toolbar btn-group-banner">
            <div class="btn-group btn-group-banner">
              {{verbatim}}
              <a class="btn btn-primary" data-submit-form>Sign In</a><a
                class="btn btn-primary"
                data-popover-template="/partials/navbar-profile-actions.html"
                data-popover-visible="showProfileActions"
                data-title="Profile Actions"
                data-placement="bottom"><i class="caret"></i>
              </a>
              {{/verbatim}}
            </div>
            <div class="btn-group btn-group-banner">
              <a class="btn btn-inverse" href="/profile/create">Sign Up</a>
            </div>
          </div>
          <div name="login-feedback" class="hide"></div>
        </fieldset>
      </form>
      {{/if}}
    </div>
  </div>
</div>
