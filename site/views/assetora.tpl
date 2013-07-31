${set([
  pageTitle = "Assetora",
  jsList.push("polyfill/typedarray"),
  jsList.push("polyfill/Blob"),
  jsList.push("forge/forge.rsa.bundle"),
  jsList.push("zip/zip"),
  jsList.push("zip/deflate"),
  jsList.push("filesaver/FileSaver"),
  jsList.push("modules/assetora"),
  inav = "assetora"
])}  
{{partial "head.tpl"}}

{{verbatim}}
<div class="container ng-cloak">
  <div data-ng-view></div>
</div>
{{/verbatim}}

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
