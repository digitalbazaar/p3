To: {{deposits.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} withdrawal FAILED: {{withdrawal.currency}} ${{withdrawal.amount}} ({{withdrawal.id}})

Machine:         {{machine}}
Transaction ID:  {{withdrawal.id}}
Date:            {{withdrawal.created}}
Credit:          {{withdrawal.currency}} ${{amount}}
Requestor ID:    {{identity.id}}
Requestor Email: {{identity.email}}
Requestor Label: {{identity.label}}

{% if headers %}
============================== HTTP Headers ================================
{% for h in headers -%}
{{loop.key}}: {{h}}
{% endfor -%}
{% endif -%}
=============================== Requestor ==================================
{{toJson(identity)}}
=============================== Withdrawal =================================
{{toJson(withdrawal)}}
================================= Error ====================================
{{toJson(error)}}
