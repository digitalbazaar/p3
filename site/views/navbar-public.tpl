${set([
  jsList.push("legacy/website.transmitter"),
  jsList.push("legacy/website.util"),
  jsList.push("legacy/payswarm.api"),
  jsList.push("legacy/navbar-public"),
  jsList.push("legacy/login"),
  templateMap["navbar-signin-popover-tmpl"] = cacheRoot + "/legacy/jqtpl/navbar-signin-popover-tmpl.html"
])}

<div class="navbar">
  <div class="navbar-inner navbar-inner-banner">
    <div class="container">
      <a class="brand" href="/"><img src="${cacheRoot}${style.brand.src}" width="${style.brand.width}" height="${style.brand.height}" alt="${style.brand.alt}" /></a>      
      {{if pageLayout == "normal"}}
      <form id="login" class="navbar-form pull-right">
        <fieldset>
          <input class="input-medium" name="profile" type="text" placeholder="E-mail" />
          <input class="input-medium" name="password" type="password" placeholder="Password" />
          <div class="btn-toolbar btn-group-banner">
            <div class="btn-group btn-group-banner">
              <a class="btn btn-primary" id="signin-button">Sign In</a><!--
              --><a class="btn btn-primary" id="popover-signin-button">
                <i class="caret"></i>
              </a>
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
