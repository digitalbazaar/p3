To: deposits@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} deposit FAILED: {{deposit.currency}} ${{deposit.amount}} ({{deposit.id}})

Machine:         {{machine}}
Transaction ID:  {{deposit.id}}
Date:            {{deposit.created}}
Charge:          {{deposit.currency}} ${{deposit.amount}}
Requestor:       {{profile.id}}
Requestor Email: {{profile.email}}
Requestor Label: {{profile.label}}

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
