To: withdrawals@{{supportDomain}}
From: cluster@{{supportDomain}}
Subject: {{subjectPrefix}}{{serviceName}} {{stage}} withdrawal: {{withdrawal.currency}} ${{amount}} ({{withdrawal.id}})

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
