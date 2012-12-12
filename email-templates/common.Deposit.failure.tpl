To: deposits@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} deposit FAILED: USD ${{deposit.amount}} ({{deposit.id}})

Machine:        {{machine}}
Transaction ID: {{deposit.id}}
Date:           {{deposit.created}}
Charge:         USD ${{deposit.amount}}

{% if headers %}
============================== HTTP Headers ================================
{% for h in headers -%}
{{loop.key}}: {{h}}
{% endfor -%}
{% endif -%}
=============================== Requestor ==================================
{{profile|json_encode(2)}}
================================ Deposit ===================================
{{deposit|json_encode(2)}}
================================= Error ====================================
{{error|json_encode(2)}}
