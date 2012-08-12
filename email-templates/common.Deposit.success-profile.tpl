To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}{{serviceName}} deposit receipt
{% if productionMode == false %}
*** NOTE ***
This is a demonstration website notification and no real money was involved. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*** NOTE ***

{% endif -%}
Your credit card has been charged for USD ${{deposit.amount}}. 
Here is your deposit receipt:

Transaction ID : {{deposit.id}}
Date and Time  : {{deposit.created}}
{% for transfer in deposit.transfer -%}
{%- if transfer.comment == "Deposit" -%}{#- FIXME: need a better check for profiles target account -#}
{{serviceName}} Account: {{transfer.destination}}{# FIXME: append "({ { ...destinationAccountName} })" #}
{%- endif -%}
{%- endfor %}

Credit Card Information:
 Name  : {{deposit.source.label}}
 Number: {{deposit.source.cardNumber}}
 Exp   : {{deposit.source.cardExpMonth}}/{{deposit.source.cardExpYear}}
 Charge: USD ${{deposit.amount}}

Deposit Information:
{%- for transfer in deposit.transfer %}
   {{transfer.comment}}: USD ${{transfer.amount}}
{%- endfor %}

You can always view your latest financial activity on your profile page.

{{deposit.transfer[0].destination}}?view=activity

If you have any questions or comments please contact support@{{supportDomain}}.

