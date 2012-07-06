To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}{{serviceName}} deposit successful

{% if productionMode == false %}
*******
NOTE: This is a demonstration website notification and no real money was involved. More info is available at http://payswarm.com/wiki/Demo_Warning.
*******

{% endif -%}
Hello {{profile.label}},

A charge in the amount of USD ${{deposit.amount}} has been charged to your credit card. Here is your deposit receipt:

Transaction ID : {{deposit.id}}
Date and Time  : {{deposit.created}}
{% for transfer in deposit.transfer -%}
{%- if transfer.comment == "Deposit" -%}{#- FIXME: need a better check for profiles target account -#}
{{serviceName}} Account: {{transfer.destination}}{# FIXME: append "({ { ...destinationAccountName} })" #}
{%- endif -%}
{%- endfor %}

Credit Card Information:
 Name  : {{deposit.source.label}}
 Type  : {{deposit.source.cardBrand}}
 Number: {{deposit.source.cardNumber}}
 Exp   : {{deposit.source.cardExpMonth}}/{{deposit.source.cardExpYear}}
 Charge: USD ${{deposit.amount}}

Deposit Information:
{%- for transfer in deposit.transfer %}
   {{transfer.comment}}: USD ${{transfer.amount}}
{%- endfor %}

Now that you've deposited money into your account, you can use PaySwarm at many fine services. You can always view your latest activity on your profile page.

https://{{serviceDomain}}/profile/financial/activity

If you have any questions or comments please contact support@{{supportDomain}}.

Digital Bazaar, Inc.
Blacksburg, VA, USA
