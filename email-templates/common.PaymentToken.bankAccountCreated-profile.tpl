To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}Bank account linked on {{serviceName}}

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*******
{% endif %}
Hello {{identity.label}},

Your bank account "{{paymentToken.label}}" has begun the verification process
on the {{serviceName}} website! In about 3-7 business days, you should see two
small deposits appear on your bank statement for the following bank account:

Account Number: {{paymentToken.bankAccount}}
Routing Number: {{paymentToken.bankRoutingNumber}}

The deposits should have the label "DIGITIAL BAZAAR CREDIT". You will need to
record the amounts associated with these deposits and enter them into the
{{serviceName}} website in order to complete the verification process that will
link your bank account with {{serviceName}}. It may take up to 24 hours after
the deposits appear on your bank statement for the "Verify" link to become
available on the {{serviceName}} website.

You can verify and manage your bank accounts here:

{{identity.id}}/settings

We'd love to hear any feedback you have about {{serviceName}}. 
Just send an email to comments@{{supportDomain}}.

If you have any questions or comments please contact support@{{supportDomain}}.
