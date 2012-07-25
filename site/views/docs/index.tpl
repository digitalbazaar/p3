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

{{each(section, annotations) docs}}
<div class="row">
  <div class="span10 offset1">
    <h2>${__(section)}</h2>
    <dl>
      {{each(ai, annotation) annotations}}
      <dt>${annotation.method} ${annotation.path}</dt>
      <dd>${annotation.description}</dd>
      {{/each}}
    </dl>
  </div>
</div>
{{/each}}

{{partial "site/foot.tpl"}}
