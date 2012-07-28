${set([
  category = "Discovery",
  freeLimit = ["by-ip"],
  authentication = null,
  validation = null,
  shortDescription = "Retrieves the Web Keys service endpoints as defined in the Web Keys specification.",  
  cssList.push("index")
])}
{{partial "site/head.tpl"}}

<div class="row">
  <div class="span10 offset1">
    <h1 class="headline">METHOD ENDPOINT</h1>
  </div>
</div>

<hr />

<table>
 <tr><td>Topic</td><td>Budgets</td></tr>
 <tr><td>Rate Limit</td><td>${freeLimit[0]}</td></tr>
 <tr><td>Authentication</td><td>${authentication[0]}</td></tr>
</table>

<div class="row">
  <div class="span10 offset1">
    <p>
${shortDescription}
    </p>
  </div>
</div>

{{partial "site/foot.tpl"}}
