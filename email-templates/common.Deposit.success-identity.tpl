To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}{{service.name}} deposit receipt

{% if productionMode == false %}
*** NOTE ***
This is a demonstration website notification and no real money was involved.
More info is available at https://payswarm.com/wiki/Demo_Warning.
*** NOTE ***

{% endif -%}
Your {% if deposit.source.cardNumber %}card{% elseif deposit.source.bankAccount %}bank account{% else %}account{% endif %} has been charged ${{deposit.amount}} {{deposit.currency}}.

{%- if deposit.source.bankAccount %}

It will take between 3-7 business days for the money to be transferred from your
bank account to {{service.name}}.
{%- endif %}

Here is your deposit receipt:

Transaction ID: {{deposit.id}}
Date and Time:  {{deposit.created}}
Source:
 From:    {{deposit.source.label}}
{% if deposit.source.cardNumber %} Number:  {{deposit.source.cardNumber}}
 Exp:     {{deposit.source.cardExpMonth}}/{{deposit.source.cardExpYear}}
{% elseif deposit.source.bankAccount %} Routing: {{deposit.source.bankRoutingNumber}}
 Account: {{deposit.source.bankAccount}}
{% endif %} Charge:  ${{deposit.amount}} {{deposit.currency}}
Deposit Details*:
{%- for transfer in deposit.transfer %}
 {{transfer.comment}}: ${{transfer.amount}} {{transfer.currency}}
{%- endfor %}

You can view your latest financial activity on your account activity page.

{{deposit.transfer[0].destination}}?view=activity

If you have any questions or comments please contact {{support.email}}.

* All deposit fees are used to reimburse {{service.name}} for fees charged by banks and the banking and financial networks.
