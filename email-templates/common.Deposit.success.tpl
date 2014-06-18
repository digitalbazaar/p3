To: deposits@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} {{stage}} deposit: {{deposit.currency}} ${{deposit.amount}} ({{deposit.id}})

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
