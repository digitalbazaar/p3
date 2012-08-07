${set([
  category = "Budgets",
  freeLimit = ["by-user"],
  authentication = ["signature"],
  validator = "services.budget.postBudgets",
  shortDescription = "Creates a new budget for restricting certain types of spending."
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
This service is used to create a budget for the purposes of restricting 
particular types of spending. Buyers can create budgets to restrict spending
in a particular area of interest, such as music, movies, or ebooks. Buyers
can also create budgets and assign them to particular vendors to restrict
how much a vendor can auto-withdraw from a buyer's account for a 
subscription-based payment.
    </p>
    <p>
Budgets have a number of parameters including the total budget amount, 
a refresh period, and an expiration date. The total budget amount is the
monetary amount that is assigned to the budget. Every purchase that uses the
budget deducts from this monetary amount. The refresh period is when the
budget restriction should be reset to its original amount. For example, if 
a $5.00 budget has a refresh period of a month, then the budget is reset to
$5.00 every month. The expiration is the date at which a budget should
be deleted if it is not used before that date. So, if a budget has an 
expiration in 3 months, and the budget isn't used for 3 months, the budget
will be deleted.   
    </p>
  </div>
</div>

<hr />

<div class="row">
  <div class="span8">
    <table class="rest-details">
      <tr><th colspan="2">Path Parameters</th></tr>
      <tr><td class="rest-parameter">:identity</td><td>The identity that is creating the budget.</td></tr>
    </table>
  </div>
  <div class="span4">
    <table class="rest-details">
      <tr><th colspan="2">Security Parameters</th></tr>
      <tr><td class="rest-parameter">Rate Limit</td><td>${freeLimit[0]}</td></tr>
      <tr><td class="rest-parameter">Authentication</td><td>${authentication[0]}</td></tr>
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
The example below creates a new budget labeled "Music" and assigns $10.00 to
the budget. The budget refreshes monthly and expires in 2,629,800 seconds
(roughly one month). The budget will refill every month. The financial 
account that funds will be pulled from when the budget is used to make a
purchase is <em>https://${host}/i/jane/accounts/primary</em>.
    </p>
    <table>
      <tr><td>Request</td><td><pre>{
  "@context": "http://purl.org/payswarm/v1",
  "label": "Music",
  "amount": "10.00",
  "psaRefresh": "psa:Monthly",
  "psaExpires": "2629800",
  "source": "https://${host}/i/jane/accounts/primary"
}</pre></td></tr>
      <tr><td>Response</td><td><pre class="span11">{
  "owner": "https://${host}/i/jane",
  "id": "https://${host}/i/jane/budgets/1.2.dc.1",
  "label": "Music",
  "source": "https://${host}/i/jane/accounts/primary",
  "amount": "10.00",
  "psaRefresh": "psa:Monthly",
  "psaExpires": 1346200213,
  "type": [
    "psa:Budget"
  ],
  "balance": "10.00",
  "psaMaxPerUse": "10.00",
  "psaRefreshed": 1343570413,
  "vendor": []
}</pre></td</tr>
    </table>
  </div>
</div>

<div class="row">
  <div class="span12">
    <h2>Validation</h2>
    {{html docs.validatorHtml}}
  </div>
</div>

{{partial "site/foot.tpl"}}
