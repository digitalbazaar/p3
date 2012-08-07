${set([
  category = "Discovery",
  freeLimit = ["by-ip"],
  shortDescription = "Retrieves the PaySwarm configuration for the site."
])}
{{partial "site/head.tpl"}}

<h1 class="row">
  <div class="span12 rest-summary">
    <span class="rest-verb ${docs.method}">${docs.method}</span>
    <span class="rest-path">${docs.path}</span>
  </div>
</h1>

<hr />

<div class="row">
  <div class="span12">
    <h2>Overview</h2>
    <p>
The <a href="http://payswarm.com/">PaySwarm</a> specifications detail how
to transfer money and perform commercial transactions via the Web. Each service
described in a PaySwarm specification has a REST Web Service endpoint. In order
for a PaySwarm client to use these endpoints, they must first be discovered.
    </p>
    
    <p>
This URL is the PaySwarm Services Discovery endpoint. It returns the
endpoints elaborated upon in the 
<a href="http://payswarm.com/specs/">PaySwarm specifications</a>.
The document returned is a simple JSON-LD document
that contains service name to URL bindings. By retrieving this document,
a PaySwarm client will discover the endpoints needed to perform transactions
and a variety of other tasks via a PaySwarm network.
    </p>
  </div>
</div>

<hr />

<div class="row">
  <div class="span8">
    <table class="rest-details">
      <tr><th colspan="2">Path Parameters</th></tr>
      <tr><td>none</td></tr>
    </table>
  </div>
  <div class="span4">
    <table class="rest-details">
      <tr><th colspan="2">Security Parameters</th></tr>
      <tr><td class="rest-parameter">Rate Limit</td><td>${freeLimit[0]}</td></tr>
      <tr><td class="rest-parameter">Authentication</td><td>None</td></tr>
    </table>
  </div>
</div>
<div class="row">
  <div class="span8">
    <table class="rest-details">
      <tr><th colspan="2">Query Parameters</th></tr>
      <tr><td>none</td></tr>
    </table>
  </div>
</div>

<hr />

<div class="row">
  <div class="span12">
    <h2>Example</h2>
    <p>
To retrieve the document below, a simple HTTP GET is performed on the following
URL: <a href="https://${host}${docs.path}">https://${host}${docs.path}</a>
    </p>
    <table>
      <tr><td>Response</td><td><pre class="span11">{
  "@context": "http://purl.org/payswarm/v1",
  "id": "https://${host}/",
  "authorityIdentity": "https://${host}/i/authority",
  "publicKey": "https://${host}/i/authority/keys/1",
  "contractService": "https://${host}/contracts",
  "licenseService": "https://${host}/licenses",
  "paymentService": "https://${host}/transactions?form=pay",
  "vendorRegistrationService": "https://${host}/i?form=register"
}
</pre></td</tr>
    </table>
  </div>
</div>

{{partial "site/foot.tpl"}}
