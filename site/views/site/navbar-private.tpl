${set([
  jsList.push("common/scripts/navbar-private"),
  jsList.push("common/scripts/payswarm.api"),
  jsList.push("common/scripts/website.transmitter"),
  jsList.push("common/scripts/website.util"),
  jsList.push("common/scripts/modals.add-identity"),
  jsList.push("common/scripts/modals.switch-identity"),
  jsList.push("common/scripts/selectors"),
  jsList.push("common/scripts/tmpl.funcs"),
  clientData.session = session,
  templateMap["navbar-hovercard-tmpl"] = cacheRoot + "/content/jqtpl/navbar-hovercard-tmpl.html",
])}

{{partial "modals/add-account.tpl"}}
{{partial "modals/add-identity.tpl"}}
{{partial "modals/switch-identity.tpl"}}
{{partial "selectors.tpl"}}

<div class="navbar">
  <div class="navbar-inner navbar-inner-banner">
    <div class="container">
      {{if session.loaded && session.identity.owner == session.profile.id}}
        {{if pageLayout == "normal"}}
          <a class="brand" href="/"><img src="${cacheRoot}${style.brand.src}" width="${style.brand.width}" height="${style.brand.height}" alt="${style.brand.alt}" /></a>      
          <ul class="nav">
            <li {{if inav == "dashboard"}}class="active"{{/if}}><a href="${session.identity.id}/dashboard"><i class="icon-info-sign{{if style.navbar.isDark}} icon-white{{/if}}"></i> Dashboard</a></li>
          </ul>
        {{else}}
          <img class="brand-minimal" src="${cacheRoot}/content/payswarm.png" width="182" height="24" alt="PaySwarm" />
        {{/if}}

        <a class="btn btn-nav btn-small show pull-right" id="popover-profile-button">
          <i class="icon-user{{if style.navbar.isDark}} icon-white{{/if}}"></i>
        </a>
        <a id="popover-profile-link" class="navbar-link pull-right" style="line-height:45px">
        {{if session.identity}}
          ${display(session.identity.label, "-")}
        {{else}}
          ${display(session.profile.label, "-")}
        {{/if}}
        </a>
      {{/if}}
    </div>
  </div>
</div>
