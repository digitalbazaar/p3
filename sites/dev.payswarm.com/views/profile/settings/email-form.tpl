<form id="email" class="ajax standard"
   method="post" action="/profile/email">
   <h3>Email</h3>

   <input name="@id" type="hidden" value="${profile["@id"]}" />

   <p class="clearfix">
      <label class="block-inline w29 mr1">Email Address
         <input name="foaf:mbox" type="text" value="${profile["foaf:mbox"]}"/>
      </label>
      
      <label class="block-inline w30">Current Password
         <input name="psa:password" type="password" maxlength="32" />
      </label>
   </p>

   <p>
      <button class="default" type="submit">
         Update Email
      </button>
   </p>

   <div id="email-feedback">
      {{if message}}<p class="message ${type}>${message}</p>{{/if}}
   </div>
</form>
