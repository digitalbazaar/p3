To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}Bank account linking started on {{service.name}}

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******
{% endif %}
Hello {{identity.label}},

We have begun the verification process for linking your bank account,
which you labeled "{{paymentToken.label}}", with the {{service.name}} website! 
In about 3-7 business days, you should see two small deposits appear on your
bank statement for the following bank account:

Account Number: {{paymentToken.bankAccount}}
Routing Number: {{paymentToken.bankRoutingNumber}}

The deposits should have the label "DIGITAL BAZAAR CREDIT". You will need to
record the amounts associated with these deposits and enter them into the
{{service.name}} website in order to complete the verification process that will
link your bank account. It may take up to 24 hours after the deposits appear
on your bank statement for the "Verify" link to become available on the
{{service.name}} website.

You can verify and manage your bank accounts here:

{{identity.id}}/settings

We'd love to hear any feedback you have about {{service.name}}. 
Just send an email to {{comments.email}}.

If you have any questions or comments please contact {{support.email}}.
