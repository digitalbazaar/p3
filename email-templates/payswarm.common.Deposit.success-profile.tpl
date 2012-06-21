To: {{html profile.email}}
From: "{{html serviceName}} Customer Support" <support@{{html supportDomain}}>
Subject: {{html profileSubjectPrefix}}{{html serviceName}} deposit successful

{{if productionMode == false}}
*******
NOTE: This is a demonstration website notification and no real money was involved. More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{{/if}}
Hello {{html profile.label}},

A charge in the amount of USD {{html "$"}}{{html deposit.amount}} has been charged to your credit card. Here is your deposit receipt:

Transaction ID : {{html deposit.id}}
Date and Time  : {{html deposit.created}}
{{each(idx,transfer) deposit.transfer}}
{{if transfer.comment == "Deposit"}}{{! FIXME: need a better check for profiles target account}}
{{html serviceName}} Account: {{html transfer.destination}}{{! FIXME: append "({ {html ...destinationAccountName} })"}}
{{/if}}
{{/each}}

Credit Card Information:
   Name  : {{html deposit.source.label}}
   Type  : {{html deposit.source.cardBrand}}
   Number: {{html deposit.source.cardNumber}}
   Exp   : {{html deposit.source.cardExpMonth}}/{{html deposit.source.cardExpYear}}
   Charge: USD {{html "$"}}{{html deposit.amount}}

Deposit Information:
{{each(idx,transfer) deposit.transfer}}
   {{html transfer.comment}}: USD {{html "$"}}{{html transfer.amount}}
{{/each}}

Now that you've deposited money into your account, you can use PaySwarm at many fine services. You can always view your latest activity on your profile page.

https://{{html serviceDomain}}/profile/financial/activity

If you have any questions or comments please contact support@{{html supportDomain}}.

Digital Bazaar, Inc.
Blacksburg, VA, USA
