To: deposits@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} withdrawal FAILED: {{withdrawal.currency}} ${{withdrawal.amount}} ({{withdrawal.id}})

Machine:         {{machine}}
Transaction ID:  {{withdrawal.id}}
Date:            {{withdrawal.created}}
Credit:          {{withdrawal.currency}} ${{amount}}
Requestor ID:    {{profile.id}}
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
=============================== Withdrawal =================================
{{withdrawal|json_encode(2)}}
================================= Error ====================================
{{error|json_encode(2)}}
