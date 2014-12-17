To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}Verify your bank account on {{service.name}}

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******
{% endif %}
Hello {{identity.label}},

Your bank account "{{paymentToken.label}}" is ready to be verified on the {{service.name}} website!
{% if verify %}
Because this is a development sandbox and this bank account is not real, the
transaction amounts required to verify the bank account are included below.
On a real system you would get these amounts from your bank.

Amounts: {{verify[0].amount}}, {{verify[1].amount}}
{% endif %}
You can verify and manage your bank accounts here:

{{identity.id}}/settings

We'd love to hear any feedback you have about {{service.name}}. 
Just send an email to {{comments.email}}.

If you have any questions or comments please contact {{support.email}}.
