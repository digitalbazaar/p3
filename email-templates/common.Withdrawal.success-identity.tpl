To: {{identity.email}}
From: "{{service.name}} {{support.name}}" <{{support.email}}>
Subject: {{subject.identityPrefix}}{{service.name}} withdrawal receipt

{% if productionMode == false %}
*** NOTE ***
This is a demonstration website notification and no real money was involved. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*** NOTE ***

{% endif -%}
Your {% if withdrawal.destination.bankAccount %}bank account{% else %}account{% endif %} has been credited with ${{amount}} {{withdrawal.currency}}. 

{%- if withdrawal.destination.bankAccount %}

It will take between 3-7 business days for the money to be transferred from
{{service.name}} to your bank account.
{%- endif %}

Here is your withdrawal receipt:

Transaction ID: {{withdrawal.id}}
Date and Time:  {{withdrawal.created}}
Source:
 From:    {{withdrawal.source}}
Destination:
{% if withdrawal.destination.bankAccount %} Routing: {{withdrawal.destination.bankRoutingNumber}}
 Account: {{withdrawal.destination.bankAccount}}
{% endif %} Credit:  ${{amount}} {{withdrawal.currency}}
Withdrawal Details*:
{%- for transfer in withdrawal.transfer %}
 {{transfer.comment}}: ${{transfer.amount}} {{transfer.currency}}
{%- endfor %}

You can view your latest financial activity on your account activity page.

{{withdrawal.transfer[0].source}}?view=activity

If you have any questions or comments please contact {{support.email}}.

* All withdrawal fees are used to reimburse {{service.name}} for fees charged by banks and the banking and financial networks.
