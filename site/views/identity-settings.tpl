${set([
  pageTitle= "Identity",
  cssList.push("identities"),
  jsList.push("common/scripts/tmpl.funcs"),
  jsList.push("common/scripts/tmpl.funcs.countries"),
  jsList.push("common/scripts/jquery.tmpl"),
  jsList.push("common/scripts/website.util"),
  jsList.push("common/scripts/website.transmitter"),
  jsList.push("common/scripts/address-selector"),
  jsList.push("common/scripts/identity"),
  inav = "settings"
])}

{{partial "site/head.tpl"}}
{{partial "identity/identity-nav.tpl"}}

{{! FIXME: convert rest to jqtpl }}

<div>
   <div class="p">
      <h3>Identity Management</h3>
   
      <div class="left p widget widget-width">
         <div class="widget-header">
            <div class="widget-header-buttons">
               <button id="edit-identity-sob" class="widget-header-button-first">Edit Identity</button>
               <button id="add-identity-sob" class="widget-header-button-last">Add Identity</button>
            </div>
         </div>

         <div id="identity-edit-slideout" class="widget-body widget-open">
            {:include file="identities/identity-edit-form.tpl"}
         </div>

         <div id="identity-add-slideout" class="widget-body widget-closed">
            {:include file="identities/identity-add-form.tpl"}
         </div>
         
         <!-- <div class="widget-footer"></div> -->
      </div>
   </div>

   <div class="p">
      <h3>Default Legal Name and Address</h3>
   
      <div id="address-selector" class="left p widget-width"></div>
   </div>
</div>

<div>
   <div class="addresses">
      <h3>Addresses</h3>
   </div>

   <div class="identity">
      <div id="identity-{identity.@id}" class="clearfix">
         <span class="inline-edit"><a href="/i/{identity.@id|escape('url')}">Edit</a></span>
         <span class="inline-status">Changes Saved</span>

         <h3><a href="{identity.@id}">{identity.rdfs:label}</a>{:if identity.psa:status != "active"} <span class="disabled">(Disabled)</span>{:end}</h3>

         {:if identity.vcard:adr}
         <div class="block-inline w46 mr1">
            <h4>Addresses</h4>

            {:each from=identity.vcard:adr as=address}
            <address>
               <strong>{address.vcard:fn}</strong><br/>
               {address.vcard:street\-address}<br/>
               {address.vcard:locality}, {address.vcard:region} {address.vcard:postal\-code}<br/>
               {address.vcard:country\-name}
            </address>
            {:end}
         </div>
         {:end}

         <div class="block-inline w46 ml1">
         {*identity|json('false')*}
         </div>

         <p class="hide">
            <label>Label
               <input name="rdfs:label" value="{identity.rdfs:label}">
            </label><label>Type
               <input name="@type" value="{identity.@type}">
            </label><label>Privacy
               <input name="psa:privacy" value="{identity.psa:privacy|default('private')|capitalize}">
            </label>
         </p>
      </div>
      
      <div id="accounts-{identity.@id}" class="accounts">
         <h4>Accounts</h4>
         {:each from=identity.accounts as=account}
         <div id="account-{account.@id}" class="account">
            <span class="label"><a href="/financial/activity?account={account.@id|escape('url')}">{account.rdfs:label}</a>{:if account.psa:status != "active"} <span class="disabled">(Disabled)</span>{:end}</span>
            <span class="balance"><span class="currency">{account.com:currency} $</span> {account.com:balance|decimal('2', 'down')}</span>
            <span class="inline-edit"><a href="{account.@id}?form=edit">Edit</a></span>
         </div>
         {:eachelse}
         <p>No accounts</p>
         {:end}
      </div>
      
      <div id="keys-{identity.@id}" class="keys">
         <h4>Keys</h4>
         {:each from=identity.keys as=key}
         <div id="key-{key.@id}" class="key">
            <span class="label">{key.rdfs:label}</span>
            <span class="data"></span>
         </div>
         {:eachelse}
         <p>No keys</p>
         {:end}
      </div>
   </div>
</div>

{* :dump identity *}

{:include file="address/address-selector.tpl"}

<script id="identity-update-success-tmpl" type="text/x-jquery-tmpl">
   <p class="message success">Your changes have been saved.</p>
</script>

{:include file="site/foot.tpl"}
