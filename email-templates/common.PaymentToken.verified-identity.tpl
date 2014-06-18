To: {{identity.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{identitySubjectPrefix}}Your bank account has been verified on {{serviceName}}

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
Hello {{identity.label}},

Your bank account "{{paymentToken.label}}" has been verified on {{serviceName}}!

You can manage your bank accounts here:

{{identity.id}}/settings

We'd love to hear any feedback you have about {{serviceName}}. 
Just send an email to comments@{{supportDomain}}.

If you have any questions or comments please contact support@{{supportDomain}}.
