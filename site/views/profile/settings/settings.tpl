${set([
  pageTitle = "Profile Settings",
  pnav = "settings"
])}
{{partial "head.tpl"}}
{{partial "profile/profile-nav.tpl"}}

<div class="form">
  {{partial "profile/profile-form.tpl"}}
</div>

<div class="form dropdown">
  {{partial "profile/password/password-form.tpl"}}
</div>

<div class="form dropdown">
  {partial "profile/settings/email-form.tpl"}}
</div>

{{partial "foot.tpl"}}
