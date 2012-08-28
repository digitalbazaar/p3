${set([
  pageTitle = "Create a Profile",
  jsList.push("legacy/website.transmitter"),
  jsList.push("legacy/website.util"),
  jsList.push("legacy/profile-create")
])}
{{partial "head.tpl"}}

<div class="row">
  <div class="span8 offset2">    
    {{partial "profile/create/create-form.tpl"}}
  </div>
</div>    

{{partial "foot.tpl"}}
