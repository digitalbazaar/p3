${set([
  pageTitle = "Welcome",
  cssList.push("index")
])}
{{partial "site/head.tpl"}}

<div class="row">
  <div class="span10 offset1">
    <h1 class="headline">REST API Documentation</h1>
  </div>
</div>

<hr />

<div class="row">
  <div class="span10 offset1">
    <p>
This page contains RESTful API documentation for this PaySwarm Authority. If
you are a developer, this page will help you figure out what you need to send
to this system in order to register access keys, initiate transactions,
get transaction history, and perform a variety of other tasks in an automated
fashion. 
    </p>
  </div>
</div>

<div class="row">
  <div class="span8 offset2">
    <h2>REST Endpoints</h2>
  </div>
</div>

<dl>
{{each(idx, endpoint) endpoints}}
  <dt>${endpoint.url}</dt>
  <dd>${endpoint.description}</dd>
{{/each}}
</dl>

{{partial "site/foot.tpl"}}
