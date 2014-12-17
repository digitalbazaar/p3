To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}{{service.name}} purchase notification

{% if productionMode == false %}
*******
NOTE: This is a demo website notification and no real money was involved.
More info is available at https://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
A purchase has just been made using your {{service.name}} account.

Asset: "{{contract.asset.title}}" by {{contract.asset.creator.name}}
Asset Provider{% if contract.assetProvider.id == contract.vendor.id %} and Vendor{% endif %}: {{contract.assetProvider.label}} ({{contract.assetProvider.url}})
{% if contract.assetProvider.id != contract.vendor.id -%}
Vendor: {{contract.vendor.label}} ({{contract.vendor.url}})
{% endif %}
The purchased content is available here:

{{contract.asset.assetContent}}

The details of this transaction are located here:

{{contract.id}}

If you have any questions or comments about this purchase, please contact:
{{support.email}}

Digital Bazaar, Inc.
Blacksburg, VA, USA
