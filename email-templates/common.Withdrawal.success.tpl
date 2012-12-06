To: withdrawals@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} {{stage}} withdrawal: USD ${{amount}} ({{withdrawal.id}})

Machine        : {{machine}}
Transaction ID : {{withdrawal.id}}
Date           : {{withdrawal.created}}
Credit         : USD ${{amount}}

{% if headers %}
============================== HTTP Headers ================================
{% for h in headers -%}
{{loop.key}}: {{h}}
{% endfor -%}
{% endif -%}
=============================== Requestor ==================================
{{profile|json_encode(2)}}
=============================== Withdrawal =================================
{{withdrawal|json_encode(2)}}
