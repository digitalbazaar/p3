<div>
   <h2>
      {{! <img src="{{if profile.depiction}}${profile.depiction}{{else}}https://secure.gravatar.com/avatar/00000000000000000000000000000000{{/if}}?s=28&d=mm" width="28" height="28" /> }}
      ${profile["rdfs:label"]}
   </h2>
   
   <div class="nav nav-tabs">
      {{if session.loaded}}
      <li {{if pnav == "profile"}}class="active"{{/if}}><a href="/profile"><i class="icon-info-sign"></i> Profile</a></li>
      <li {{if pnav == "settings"}}class="active"{{/if}}><a href="/profile/settings"><i class="icon-cog"></i> Settings</a></li>
      <li {{if pnav == "identities"}}class="active"{{/if}}><a href="/i"><i class="icon-user"></i> Identities</a></li>
      {{else}}
      &nbsp;
      {{/if}}
   </div>
</div>
