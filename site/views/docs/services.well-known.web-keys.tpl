${set([
  category = "Discovery",
  freeLimit = ["by-ip"],
  shortDescription = "Retrieves the Web Keys configuration for the site."
])}
{{partial "head.tpl"}}

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
The <a href="http://payswarm.com/specs/source/web-keys/">Web Keys</a> 
specification describes how to setup a Web-native  
<a href="http://en.wikipedia.org/wiki/Public_key_infrastructure">Public 
Key Infrastructure</a>. The specification covers key registration, updates,
revocation, and expiration. The specification also covers how developers
may perform encryption and digital signatures for REST-based Web Services 
using Web Keys.
    </p>
    <p>
This URL is the Web Keys Service Discovery endpoint. It returns the
endpoints elaborated upon in the Web Keys specification for uploading and
managing keys via HTTP. The document returned is a simple JSON-LD document
that contains service name to URL bindings. By retrieving this document,
a Web Keys client will discover the necessary endpoints to interact with the
website's Web Keys services.
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
To retrieve the example below, a simple HTTP GET is performed on the following
URL: <a href="https://${host}${docs.path}">https://${host}${docs.path}</a>
    </p>
    <table>
      <tr><td>Response</td><td><pre class="span11">{
  "@context": "http://purl.org/payswarm/v1",
  "publicKeyService": "https://${host}/i?form=register"
}
</pre></td</tr>
    </table>
  </div>
</div>

{{partial "foot.tpl"}}
