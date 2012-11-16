To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}{{serviceName}} deposit receipt

{% if productionMode == false %}
*** NOTE ***
This is a demonstration website notification and no real money was involved. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*** NOTE ***

{% endif -%}
Your {% if deposit.source.cardNumber %}credit card{% else if deposit.source.bankAccount %}bank account{% else %}account{% endif %} has been charged for ${{deposit.amount}} USD. 

Here is your deposit receipt:

Transaction ID: {{deposit.id}}
Date and Time : {{deposit.created}}
Source:
 From   : {{deposit.source.label}}
{% if deposit.source.cardNumber %} Number : {{deposit.source.cardNumber}}
 Exp    : {{deposit.source.cardExpMonth}}/{{deposit.source.cardExpYear}}
{% else if deposit.source.bankAccount %} Routing: {{deposit.source.bankRoutingNumber}}
 Account: {{deposit.source.bankAccount}}
{% endif %} Charge : ${{deposit.amount}} USD
Deposit Details*:
{%- for transfer in deposit.transfer %}
 {{transfer.comment}}: ${{transfer.amount}} USD
{%- endfor %}

You can view your latest financial activity on your account activity page.

{{deposit.transfer[0].destination}}?view=activity

If you have any questions or comments please contact support@{{supportDomain}}.

* All deposit fees are charged by your bank's network, none of it goes to us.
