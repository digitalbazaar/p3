To: {{identity.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{identitySubjectPrefix}}A credit line payment failed for an account on {{serviceName}}

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification.
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******
{% endif %}
Hello {{identity.label}},

An attempt to pay off your used credit with your account "{{account.label}}"
has failed on the {{serviceName}} website! Please sign into {{serviceName}}
and correct your payment information to prevent any problems with future
payments.

We'd love to hear any feedback you have about {{serviceName}}.
Just send an email to comments@{{supportDomain}}.

If you have any questions or comments please contact support@{{supportDomain}}.
