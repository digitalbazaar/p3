${set(
  pageTitle = "Access Key Details",
  jsList.push("modules/key")
)}
{{partial "head.tpl"}}

<div class="row">
  <h2 class="headline">${pageTitle}</h2>
</div>

{{verbatim}}
<div data-ng-controller="KeyCtrl" class="ng-cloak"
     about="" typeof="sec:CryptographicKey">

  <div data-ng-show="key.label" class="row">
    <h3 class="headline">
      <span property="rdfs:label">{{key.label}}</span>
      <span data-ng-show="key.psaStatus">({{key.psaStatus}})</span>
    </h3>
  </div>
  
  <div data-ng-show="key.revoked" class="row">
    <div class="offset3 span6">
      <h3 class="headline">
        Revoked: <span property="sec:revoked" datatype="xsd:dateTime">{{key.revoked}}</span>
      </h3>
    </div>
  </div>

  <div class="row">
    <div class="offset3 span6">
      <pre data-ng-show="key.publicKeyPem" 
        property="sec:publicKeyPem">{{key.publicKeyPem}}</pre>
    </div>
  </div>
  
  <div class="row">
    <div class="offset3 span6">
      <h3 class="headline">
        View: <span><a rel="sec:owner" href="{{key.owner}}">owner</a></span>
      </h3>
    </div>
  </div>
  
</div>
{{/verbatim}}

{{partial "foot.tpl"}}
