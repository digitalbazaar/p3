${set(
  pageTitle = "Access Key Details",
  jsList.push("modules/key")
)}
{{partial "head.tpl"}}

{{verbatim}}
<h2 class="headline">Access Key Details</h2>

<div data-ng-controller="KeyCtrl" class="ng-cloak">

  <div data-ng-show="key.label" class="row">
    <h3 class="headline">{{key.label}}
      <span data-ng-show="key.psaStatus">({{key.psaStatus}})</span>
    </h3>
  </div>
  
  <div data-ng-show="key.revoked" class="row">
    <div class="offset3 span6">
      <h3 class="headline">
        Revoked: <span>{{key.revoked}}</span>
      </h3>
    </div>
  </div>

  <div class="row">
    <div class="offset3 span6">
      <pre data-ng-show="key.publicKeyPem">{{key.publicKeyPem}}</pre>
    </div>
  </div>
  
  <div class="row">
    <div class="offset3 span6">
      <h3 class="headline">
        View: <span><a href="{{key.owner}}">owner</a></span>
      </h3>
    </div>
  </div>
  
</div>
{{/verbatim}}

{{partial "foot.tpl"}}
