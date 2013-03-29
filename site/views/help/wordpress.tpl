${set([
  pageTitle = "PaySwarm WordPress Plugin"
])}
{{partial "head.tpl"}}

<div class="row">
  <div class="section span12">
    <h1>${pageTitle}</h1>
    <p>This page will help you setup the PaySwarm plugin for WordPress. It 
    contains step-by-step instructions and is intended to be easy to follow 
    for anyone that has previously installed a WordPress plugin.</p>
  </div>
</div>

<div class="row">
  <div class="section span12">
    <h2 class="headline">Pre-requisites</h2>

    <p>Before you install this plugin, you will need the following software
    installed on your website:</p>

    <ol>
      <li><a href="http://wordpress.org/">WordPress</a> (version 3.2 or greater)</li>
      <li><a href="http://www.php.net/">PHP</a> (version 5.3 or greater)</li>
    </ol>
  </div>
</div>

<div class="row">
  <div class="section span12">
    <h2 class="headline">Setup</h2>

    <p>To configure your PaySwarm plugin for WordPress, you must first 
    <a href="/profile/create">join ${siteTitle}.</a>
    
    <h3>Install the Software</h3>
    <ol>
      <li><a href="https://payswarm.com/downloads/">Download</a> the latest PaySwarm WordPress plugin.</li>
      <li>Unzip the file to your <code>wordpress/wp-content/plugins/</code> directory.</li>
      <li>Login as the administrator and click <strong>Plugins</strong> and <strong>Activate</strong> the PaySwarm plugin.</li>
    </ol>
    
    <h3>Registering your Blog with ${siteTitle}</h3>
    
    <ol>
      <li>Login as administrator on your WordPress website.</li>
      <li>Go to the PaySwarm plugin page (select <strong>Plugins</strong> -&gt; <strong>PaySwarm</strong>).</li>
      <li>Enter <em>${serviceHost}</em> for your <strong>PaySwarm Authority</strong> and click the <strong>Register this site</strong> button.</li>
      <li>Click the <strong>Add Identity</strong> button.
        <ol>
          <li>Enter the <strong>Name</strong> of your WordPress website (e.g. "Good Food").</li>
          <li>Select <strong>Vendor</strong> for the type of Identity.</li>
          <li>Enter the address for your website (e.g. "http://goodfood.example.com/").</li>
          <li>Enter a short description of your website (e.g. "Good Food strives to discover and share delicous recipes.").</li>
          <li>Enter the name of your new WordPress website Financial Account (e.g. "Blogging Revenue").</li>
          <li>Select <strong>Public</strong> for the type of <strong>Account Visibility</strong>. Don't worry, this will only show the account name to the public, not any of the information in the account like the balance or the list of transactions.</li>
          <li>Click the <strong>Add</strong> button.</li>
          <li>Enter the name of your <strong>Access Key Label</strong> (e.g. "Good Food Vendor Key 2012-09-25")</li>
          <li>Click the <strong>Register</strong> button.</li>
        </ol>
      </li>
      <li>If there are no errors when you get back to the WordPress plugin page, registration was successful.</li>
      <li>Go to the PaySwarm Plugin Settings page (select <strong>Settings</strong> -&gt; <strong>PaySwarm</strong>).</li>
      <li>Set the default price for articles (e.g. "0.05")</li>
      <li>Click the "Save Changes" button.</li>
    </ol>
  </div>
</div>

<div class="row">
  <div class="section span12">
    <h2 class="headline">Marking Up An Article For Sale</h2>

    <p>Once the plugin is installed, and your website is registered with
    ${siteTitle}, you can start selling content from your blog. The author of a 
    post needs to insert a single divider between the unpaid and paid 
    content in the article, like so:</p>

    <div class="highlight"><pre>This is unpaid content
<span class="c">&lt;!--payswarm--&gt;</span>
This is paid content
</pre></div>

    <p>A reader will not be able to see the paid content portion until they have
    purchased the article. The price of the article, the license that is granted
    upon purchase, and other article-specific values can be changed on a 
    per-article basis.</p>
    
    <p>When payment is made, it immediately appears in your financial account
    on ${siteTitle} and can then be withdrawn to a bank account.</p>
  </div>
</div>

<div class="row">
  <div class="section span12">
    <h2 class="headline">Getting the Source Code</h2>

    <p>The PaySwarm WordPress plugin is open source and is available at:</p>

    <p><a href="http://github.com/digitalbazaar/payswarm-wordpress">http://github.com/digitalbazaar/payswarm-wordpress</a></p>
  </div>
</div>

{{partial "foot.tpl"}}
