${set([
  pageTitle = "System Dashboard",
  cssList.push("css/system-dashboard"),
  jsList.push("d3/d3.v3"),
  jsList.push("cubism/cubism.v1"),
  jsList.push("modules/system.dashboard"),
  inav = "system-dashboard"
])}  

{{partial "head.tpl"}}

<div class="container">
  <div class="row">
    <div class="span12">
      <h1 class="headline">System Dashboard</h1>
      <hr />
    </div>
  </div>

  <div class="row">
    <div class="span12">
      <div id="stats">
    </div>
  </div>
</div>

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
