${set([
  pageTitle = "Profile",
  pnav = "profile"
])}
{{partial "head.tpl"}}
{{partial "profile/profile-nav.tpl"}}

<div id="profile" about="{profile.id}">
   <h3>Public Information</h3>

   <p class="clearfix">
      <label class="inline-block">Profile</label>
      <span class="inline-block">${profile.id}</span>
   </p>
</div>

{{partial "foot.tpl"}}
