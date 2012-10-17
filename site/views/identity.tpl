${set([
  pageTitle = "Identity"
])}
{{partial "head.tpl"}}

<div class="row">
  <div class="span12">
{{if identity.label}}
    <h1 class="headline">About ${identity.label}</h1>
{{else}}
    <h1 class="headline">About identity</h1>
{{/if}}
  </div>
</div>

{{if identity.homepage || identity.description}}
<hr />
{{/if}}
{{if identity.homepage}}
<div class="row">
  <div class="span4 offset4">
    <h2>Website</h2>
    <a href="${identity.homepage}">${identity.homepage}</a>
  </div>
</div>
{{/if}}
{{if identity.homepage && identity.description}}
<div class="row">
  <div class="span12">&nbsp;</div>
</div>
{{/if}}
{{if identity.description}}
<div class="row">
  <div class="span4 offset4">
    <h2>Description</h2>
    <p></p>
    <p>${identity.description}</p>
  </div>
</div>
{{/if}}

<hr />

<div class="row">
  <div class="span4 offset4">
    <h2>Financial Accounts</h2>
{{if accounts.length > 0}}
  <ul>
  {{each(idx,value) accounts}}
    <li><a href="${accounts[idx].id}">${accounts[idx].label}</a></li>
  {{/each}}
  </ul>
{{else}}
    <p>No publicly visible financial accounts.</p>
{{/if}}    
  </div>
</div>


<div class="row">
  <div class="span4 offset4">
    <h2>Access Keys</h2>
{{if keys.length > 0}}
  <ul>
  {{each(idx,value) keys}}
    <li><a href="${keys[idx].id}">${keys[idx].label}</a></li>
  {{/each}}
  </ul>
{{else}}
    <p>No publicly visible keys.</p>
{{/if}}
  </div>
</div>


{{partial "foot.tpl"}}
