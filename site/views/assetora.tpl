${set([
  pageTitle = "Assetora",
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
