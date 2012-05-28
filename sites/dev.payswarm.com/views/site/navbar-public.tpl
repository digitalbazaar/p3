${set([
  jsList.push("common/scripts/jquery.tmpl"),
  jsList.push("common/scripts/website.transmitter"),
  jsList.push("common/scripts/website.util"),
  jsList.push("common/scripts/payswarm.api"),
  jsList.push("common/scripts/navbar-public"),
  jsList.push("common/scripts/login"),
  templateMap["navbar-signin-popover-tmpl"] = cacheRoot + "/content/jqtpl/navbar-signin-popover-tmpl.html"
])}

<div class="navbar">
  <div class="navbar-inner navbar-inner-banner">
    <div class="container">
      <a class="brand" href="/"><img src="${cacheRoot}${style.brand.src}" width="${style.brand.width}" height="${style.brand.height}" alt="${style.brand.alt}" /></a>      
      {{if pageLayout == "normal"}}
      <form id="login" class="form-inline form-banner pull-right">
        <fieldset>
          <input class="input-medium" name="profile" type="text" placeholder="E-mail or profile name" />
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
