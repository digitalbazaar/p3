To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}Your bank account has been verified on {{service.name}}

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
Hello {{identity.label}},

Your bank account "{{paymentToken.label}}" has been verified on {{service.name}}!

You can manage your bank accounts here:

{{identity.id}}/settings

We'd love to hear any feedback you have about {{service.name}}. 
Just send an email to {{comments.email}}.

If you have any questions or comments please contact {{support.email}}.
