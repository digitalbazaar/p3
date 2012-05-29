${set([
  pageTitle = "Create a Profile",
  jsList.push("common/scripts/website.transmitter"),
  jsList.push("common/scripts/website.util"),
  jsList.push("common/scripts/profile-create")
])}
{{partial "site/head.tpl"}}

<div class="row">
  <div class="span8 offset2">    
    {{partial "profile/create/create-form.tpl"}}
  </div>
</div>    

{{partial "site/foot.tpl"}}
