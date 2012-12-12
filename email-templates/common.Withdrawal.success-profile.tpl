To: {{profile.email}}
From: "{{serviceName}} Customer Support" <support@{{supportDomain}}>
Subject: {{profileSubjectPrefix}}{{serviceName}} withdrawal receipt

{% if productionMode == false %}
*** NOTE ***
This is a demonstration website notification and no real money was involved. 
More info is available at http://payswarm.com/wiki/Demo_Warning.
*** NOTE ***

{% endif -%}
Your {% if withdrawal.destination.bankAccount %}bank account{% else %}account{% endif %} has been credited with ${{amount}} USD. 

Here is your withdrawal receipt:

Transaction ID: {{withdrawal.id}}
Date and Time:  {{withdrawal.created}}
Source:
 From:    {{withdrawal.source}}
Destination:
{% if withdrawal.destination.bankAccount %} Routing: {{withdrawal.destination.bankRoutingNumber}}
 Account: {{withdrawal.destination.bankAccount}}
{% endif %} Credit:  ${{amount}} USD
Withdrawal Details*:
{%- for transfer in withdrawal.transfer %}
 {{transfer.comment}}: ${{transfer.amount}} USD
{%- endfor %}

You can view your latest financial activity on your account activity page.

{{withdrawal.transfer[0].source}}?view=activity

If you have any questions or comments please contact support@{{supportDomain}}.

* All withdrawal fees are charged by your bank's network, none of it goes to us.
