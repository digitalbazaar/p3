${set([
  category = "Transactions",
  freeLimit = ["by-user"],
  authentication = ["cookie", "signature"],
  shortDescription = "Retrieves a single existing Transaction."
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
When a transaction is executed on a PaySwarm system, the details of 
the transaction are stored on the PaySwarm Authority. While a Receipt is 
returned to the software that initiated the transaction call, the
Receipt is often a summary of the transaction. 
In order to get the full transaction details, an HTTP GET call can be 
performed on the transaction URL.
    </p>
    
  </div>
</div>

<hr />

<div class="row">
  <div class="span8">
    <table class="rest-details">
      <tr><th colspan="2">Path Parameters</th></tr>
      <tr><td class="rest-parameter">:id</td>
        <td>The unique transaction identifier.</td></tr>
    </table>
  </div>
  <div class="span4">
    <table class="rest-details">
      <tr><th colspan="2">Security Parameters</th></tr>
      <tr><td class="rest-parameter">Rate Limit</td><td>${freeLimit}</td></tr>
      <tr><td class="rest-parameter">Authentication</td><td>${authentication}</td></tr>
    </table>
  </div>
</div>
<div class="row">
  <div class="span8">
    <table class="rest-details">
      <tr><th colspan="2">Query Parameters</th></tr>
      <tr><td class="rest-parameter">creator</td>
        <td>The Web Key URL that created the 
          <span class="rest-parameter">signatureValue</span>.
        </td></tr>
      <tr><td class="rest-parameter">signatureValue</td>
        <td>The Web Key signature for the request.</td></tr>
    </table>
  </div>
</div>

<hr />

<div class="row">
  <div class="span12">
    <h2>Example</h2>
    <p>
To retrieve the document below, a digitally signed HTTP GET is performed on 
the following URL: <a href="https://${host}/transactions/3.523.2.3">https://${host}/transactions/3.523.2.3</a>
    </p>
    <table>
      <tr><td>Response</td><td><pre class="span11">{
... UNDOCUMENTED ...
}
</pre></td</tr>
    </table>
  </div>
</div>

{{partial "site/foot.tpl"}}
