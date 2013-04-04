${set([
  pageTitle = "Identity"
])}
{{partial "head.tpl"}}

<div class="row">
  <div class="span12">
{{if identity.label}}
    <h1 class="headline">
      About <span property="rdfs:label">${identity.label}</span>
    </h1>
{{else}}
    <h1 class="headline">About Identity</h1>
{{/if}}
  </div>
</div>

{{if identity.website || identity.description}}
<hr />
{{/if}}
{{if identity.website}}
<div class="row">
  <div class="span4 offset4">
    <h2>Website</h2>
    <a property="foaf:homepage" href="${identity.website}">
      ${identity.website}
    </a>
  </div>
</div>
{{/if}}
{{if identity.website && identity.description}}
<div class="row">
  <div class="span12">&nbsp;</div>
</div>
{{/if}}
{{if identity.description}}
<div class="row">
  <div class="span4 offset4">
    <h2>Description</h2>
    <p></p>
    <p property="dc:description">${identity.description}</p>
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
    <li>
      <a rel="com:account" href="${accounts[idx].id}">
        <span property="rdfs:label">${accounts[idx].label}</span>
      </a>
    </li>
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
    <li>
      <a rel="sec:publicKey" href="${keys[idx].id}">
        <span property="rdfs:label">${keys[idx].label}</span>
      </a>
    </li>
  {{/each}}
  </ul>
{{else}}
    <p>No publicly visible keys.</p>
{{/if}}
  </div>
</div>


{{partial "foot.tpl"}}
