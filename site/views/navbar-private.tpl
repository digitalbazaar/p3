<div data-ng-controller="NavbarCtrl" class="navbar ng-cloak">
  <div class="navbar-inner navbar-inner-banner">
    <div class="container">
      {{if session.loaded && session.identity.owner == session.profile.id}}
        {{if pageLayout == "normal"}}
          <a class="brand" href="/"><img src="${cacheRoot}${style.brand.src}" width="${style.brand.width}" height="${style.brand.height}" alt="${style.brand.alt}" /></a>      
          <ul class="nav">
            <li {{if inav == "dashboard"}}class="active"{{/if}}><a href="${session.identity.id}/dashboard"><i class="icon-dashboard"></i> Dashboard</a></li>
            <li class="dropdown">
              <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                <i class="icon-briefcase"></i> Tools
                <b class="caret"></b>
              </a>
              <ul class="dropdown-menu">
                <li {{if inav == "assetora"}}class="active"{{/if}}><a href="${session.identity.id}/assetora"><i class="icon-cloud"></i> Sell Digital Content</a></li>
                <li {{if inav == "invoicing"}}class="active"{{/if}}><a href="${session.identity.id}/invoices"><i class="icon-money"></i> Invoice Customers</a></li>
                <li {{if inav == "cause"}}class="active"{{/if}}><a href="${session.identity.id}/causes"><i class="icon-heart"></i> Collect for a Cause</a></li>
                <li {{if inav == "invoice"}}class="active"{{/if}}><a href="${session.identity.id}/tickets"><i class="icon-ticket"></i> Sell Tickets</a></li>
                <li class="divider"></li>
                <li><a href="${session.identity.id}/tools"><i class="icon-list"></i> More</a></li>
              </ul>
            </li>
            <li {{if inav == "settings"}}class="active"{{/if}}><a href="${session.identity.id}/settings"><i class="icon-wrench"></i> Settings</a></li>
          </ul>
        {{else}}
          <img class="brand-minimal" src="${cacheRoot}${style.brand.src}" width="${style.brand.width}" height="${style.brand.height}" alt="${style.brand.alt}" />
        {{/if}}
        {{verbatim}}
        <a class="btn btn-nav btn-small show pull-right{{showHovercard && ' active' || ''}}"
          data-popover-template="/partials/navbar-hovercard.html"
          data-popover-visible="showHovercard"
          data-popover-min-width="minWidth()"
          data-title="{{$parent.session.identity.label || session.profile.label}}"
          data-placement="bottom">
        {{/verbatim}}
          <i class="icon-user"></i>
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
