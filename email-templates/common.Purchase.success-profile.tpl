To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}{{serviceName}} purchase notification

{% if productionMode == false %}
*******
NOTE: This is a demo website notification and no real money was involved. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
A purchase has just been made using your {{serviceName}} account.

Title:  "{{contract.asset.title}}" 
Vendor: {{contract.assetProvider.label}}.

If you would like to view the item, you can go here:

{{contract.asset.assetContent}}

If you would like to see the details of this transaction, you can go here:

{{contract.id}}

If you have any questions or comments about this purchase, 
please contact support@{{supportDomain}}.

Digital Bazaar, Inc.
Blacksburg, VA, USA
