To: deposits@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} withdrawal FAILED: USD ${{withdrawal.amount}} ({{withdrawal.id}})

Machine        : {{machine}}
Transaction ID : {{withdrawal.id}}
Date           : {{withdrawal.created}}
Charge         : USD ${{withdrawal.amount}}

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
