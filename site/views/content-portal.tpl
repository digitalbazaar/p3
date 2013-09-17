${set([
  pageTitle = "Content Portal"
])}
{{partial "head.tpl"}}

{{verbatim}}
<div class="container ng-cloak" data-ng-controller="ContentPortalCtrl">

  <div class="row">
    <div class="title-section span12">
      <h1 class="headline">Content Portal</h1>
    </div>
  </div>

  <div class="row">
    <div class="span6 offset3">
      <div class="alert alert-success">
        Click the button below to see the content you purchased.
      </div>
      <form data-ng-show="model.encryptedReceipt" method="post"
        action="{{model.asset.assetContent}}">
        <fieldset>
          <input
            name="encrypted-message" value="{{model.encryptedReceipt | json}}"
            type="hidden" />
        </fieldset>
        <div class="well center">
          <button class="btn btn-primary">View content</button>
        </div>
      </form>
      <div data-ng-hide="model.encryptedReceipt" class="well center">
        <a class="btn btn-primary" href="{{model.asset.assetContent}}">View content</a>
      </div>
    </div>
  </div>

</div>
{{/verbatim}}

{{partial "demo-warning.tpl"}}

{{partial "foot.tpl"}}
