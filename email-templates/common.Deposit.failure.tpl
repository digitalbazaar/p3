To: {{deposits.email}}
From: "{{service.name}} {{system.name}}" <{{system.email}}>
Subject: {{subject.prefix}}{{service.name}} deposit FAILED: {{deposit.currency}} ${{deposit.amount}} ({{deposit.id}})

Machine:         {{machine}}
Transaction ID:  {{deposit.id}}
Date:            {{deposit.created}}
Charge:          {{deposit.currency}} ${{deposit.amount}}
Requestor:       {{identity.id}}
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
================================ Deposit ===================================
{{toJson(deposit)}}
================================= Error ====================================
{{toJson(error)}}
