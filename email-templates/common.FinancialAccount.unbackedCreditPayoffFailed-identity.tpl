To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}A credit line payment failed for an account on {{service.name}}

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification.
More info is available at https://payswarm.com/wiki/Demo_Warning.
*******
{% endif %}
Hello {{identity.label}},

An attempt to pay off your used credit with your account "{{account.label}}"
has failed on the {{service.name}} website! Please sign into {{service.name}}
and correct your payment information to prevent any problems with future
payments.

We'd love to hear any feedback you have about {{service.name}}.
Just send an email to {{comments.email}}.

If you have any questions or comments please contact {{support.email}}.
