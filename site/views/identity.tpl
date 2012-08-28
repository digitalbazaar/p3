${set([
  pageTitle = "Identity"
])}
{{partial "head.tpl"}}

<div class="row">
  <div class="span4 offset4">
    <h1 class="headline">About ${identity.label}</h1>
  </div>
</div>
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
