${set([
  pageTitle = "Identities",
  jsList.push("common/scripts/website.transmitter"),
  pnav = "identities"
])}
{{partial "site/head.tpl"}}
{{partial "profile/profile-nav.tpl"}}

{{! FIXME: make add identity and edit identity into inline forms }}
{{! FIXME: convert below to jqtpl}}

<div>
   <div class="toolbar">
      <a class="button toolbar" href="/i">Refresh</a>
      <a class="button toolbar slideout-button" href="#slideout-identity">Add Identity</a>
      {*<a class="button toolbar" href="/i?form=add">Add Identity</a>*}
   </div>

   <div id="slideout-identity" class="form dropdown slideout-closed">
      {:include file="identities/identity-add-form.tpl"}
   </div>

   <div id="messages"></div>

   {:each from=identities as=identity}
   <div class="well identity">
      <div id="identity-{identity.id}" class="clearfix">
         <span class="inline-edit"><a href="/i/{identity.id|escape('url')}">Edit</a></span>
         <span class="inline-status">Changes Saved</span>

         <h3><a href="{identity.id}">{identity.label}</a>{:if identity.psaStatus != "active"} <span class="disabled">(Disabled)</span>{:end}</h3>

         {:if identity.address}
         <div class="block-inline w46 mr1">
            <h4>Addresses</h4>

            {:each from=identity.address as=address}
            <address>
               <strong>{address.fullName}</strong><br/>
               {address.streetAddress}<br/>
               {address.locality}, {address.region} {address.postalCode}<br/>
               {address.countryName}
            </address>
            {:end}
         </div>
         {:end}

         <div class="block-inline w46 ml1">
         {*identity|json('false')*}
         </div>

         <p class="hidden">
            <label>Label
               <input name="label" value="{identity.label}">
            </label><label>Type
               <input name="type" value="{identity.type}">
            </label><label>Privacy
               <input name="psaPrivacy" value="{identity.psaPrivacy|default('private')|capitalize}">
            </label>
         </p>
      </div>
      
      <div id="accounts-{identity.id}" class="accounts">
         <h4>Accounts</h4>
         {:each from=identity.accounts as=account}
         <div id="account-{account.id}" class="account">
            <span class="label"><a href="/financial/activity?account={account.id|escape('url')}">{account.label}</a>{:if account.psaStatus != "active"} <span class="disabled">(Disabled)</span>{:end}</span>
            <span class="balance"><span class="currency">{account.currency} $</span> {account.balance|decimal('2', 'down')}</span>
            <span class="inline-edit"><a href="{account.id}?form=edit">Edit</a></span>
         </div>
         {:eachelse}
         <p>No accounts</p>
         {:end}
      </div>
      
      <div id="keys-{identity.id}" class="keys">
         <h4>Keys</h4>
         {:each from=identity.keys as=key}
         <div id="key-{key.id}" class="key">
            <span class="label"><a href="{key.id}">{key.label}</a></span>
            <span class="data"></span>
         </div>
         {:eachelse}
         <p>No keys</p>
         {:end}
      </div>
   </div>
   {:eachelse}
   <div>
      <p class="center">You do not have any Identities.</p>
   </div>
   {:end}
</div>

{:include file="site/foot.tpl"}
