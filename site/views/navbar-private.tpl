${set([
  jsList.push("modules/navbar"),
  jsList.push("legacy/payswarm.api"),
  jsList.push("legacy/website.transmitter"),
  jsList.push("legacy/website.util"),
  jsList.push("legacy/selectors"),
  jsList.push("legacy/tmpl.funcs"),
  clientData.session = session,
  templateMap["navbar-hovercard-tmpl"] = cacheRoot + "/legacy/jqtpl/navbar-hovercard-tmpl.html",
])}

{{partial "legacy/modals/add-account.tpl"}}
{{partial "selectors.tpl"}}

<div data-ng-controller="NavbarCtrl" class="navbar ng-cloak">
  <div class="navbar-inner navbar-inner-banner">
    <div class="container">
      {{if session.loaded && session.identity.owner == session.profile.id}}
        {{if pageLayout == "normal"}}
          <a class="brand" href="/"><img src="${cacheRoot}${style.brand.src}" width="${style.brand.width}" height="${style.brand.height}" alt="${style.brand.alt}" /></a>      
          <ul class="nav">
            <li {{if inav == "dashboard"}}class="active"{{/if}}><a href="${session.identity.id}/dashboard"><i class="icon-info-sign{{if style.navbar.isDark}} icon-white{{/if}}"></i> Dashboard</a></li>
            <li {{if inav == "settings"}}class="active"{{/if}}><a href="${session.identity.id}/settings"><i class="icon-cog{{if style.navbar.isDark}} icon-white{{/if}}"></i> Settings</a></li>
          </ul>
        {{else}}
          <img class="brand-minimal" src="${cacheRoot}/img/payswarm.png" width="182" height="24" alt="PaySwarm" />
        {{/if}}
        {{verbatim}}
        <a class="btn btn-nav btn-small show pull-right{{showHovercard && ' active' || ''}}"
          data-popover-template="/partials/navbar-hovercard.html"
          data-popover-visible="showHovercard"
          data-title="{{$parent.session.identity.label || session.profile.label}}"
          data-placement="bottom">
        {{/verbatim}}
          <i class="icon-user{{if style.navbar.isDark}} icon-white{{/if}}"></i>
        </a>
        <a class="navbar-link pull-right" style="line-height:45px"
          data-ng-click="showHovercard=!showHovercard">
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
